import assert from 'node:assert/strict'
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  copyFile,
  rename,
  rm,
  readdir,
  access,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { join, resolve } from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { parseArgs } from 'node:util'
import sharp from 'sharp'
import { webkit } from 'playwright-core'
import { clips } from '../src/studio/clips.ts'
import { exerciseById } from '../src/guides/exercises.ts'
import { motionRevision } from '../asset-pipeline/motion/revision.mjs'
import { localStudio, launchBrowser } from '../asset-pipeline/motion/browser.mjs'

const { values: v } = parseArgs({
  options: {
    output: { type: 'string' },
    record: { type: 'boolean' },
    only: { type: 'string' },
    url: { type: 'string' },
  },
})
const dir = v.output ? resolve(v.output) : await mkdtemp(join(tmpdir(), 'anatomy-guide-renders-'))
await mkdir(dir, { recursive: true })
const width = 960,
  height = 540,
  fps = 24
const guides = ['stretch', 'glide'].flatMap((kind) =>
  Array.from(exerciseById[kind].values(), (guide) => ({ id: guide.id, kind, name: guide.name })),
)
const requested = v.only?.split(','),
  batch = requested ? guides.filter((g) => requested.includes(g.id)) : guides
assert(batch.length && (!requested || batch.length === requested.length), 'Unknown guide ID')
const revision = await motionRevision(),
  work = join(dir, '.verification'),
  stamp = join(work, 'revision')
if (v.record) {
  const present = await readdir(dir)
  if (present.length) {
    let old = ''
    try {
      old = await readFile(stamp, 'utf8')
    } catch {}
    if (old !== revision)
      throw Error('This folder contains another export. Choose a new output directory.')
  }
  await mkdir(work, { recursive: true })
  try {
    await writeFile(stamp, revision, { flag: 'wx' })
  } catch (e) {
    if (e.code !== 'EEXIST' || (await readFile(stamp, 'utf8')) !== revision) throw e
  }
}
const server = v.url ? null : await localStudio(),
  url = v.url ?? server.url,
  browser = process.env.STUDIO_BROWSER === 'webkit' ? await webkit.launch() : await launchBrowser()
const failures = [],
  results = []
const fileURL = (id, kind) => join(dir, id + '.' + kind)
const bytes = (data) => Buffer.from(data.substring(data.indexOf(',') + 1), 'base64')
async function publish(path, data) {
  const temp = path + '.' + randomUUID() + '.partial'
  try {
    await writeFile(temp, data)
    await rename(temp, path)
  } finally {
    await rm(temp, { force: true })
  }
}
async function stagePixels(buffer, kind) {
  const data = await sharp(buffer).resize(420, 236).removeAlpha().raw().toBuffer()
  let bonePixels = 0,
    targetPixels = 0
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2]
    if (r > b + 6 && r > 140 && g > 125) bonePixels++
    const highlighted =
      kind === 'glide'
        ? g > 132 && b > 122 && g > r * 1.25 && b > r * 1.23
        : r > 145 && g > 105 && r > g * 1.06 && g > b * 1.47
    if (highlighted) targetPixels++
  }
  assert(bonePixels > 100, 'No visible atlas skeleton on the stage')
  return { data, targetPixels }
}
function frameDelta(a, b) {
  let changed = 0
  for (let i = 0; i < a.length; i += 3)
    if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 16)
      changed++
  return changed
}
async function encoder(id, p, frames, duration) {
  const temp = join(work, id + '.' + randomUUID() + '.partial.mp4'),
    dest = fileURL(id, 'mp4')
  const proc = spawn(
    'ffmpeg',
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'image2pipe',
      '-framerate',
      String(fps),
      '-i',
      'pipe:0',
      '-an',
      '-c:v',
      'libx264',
      '-threads',
      '3',
      '-preset',
      'veryfast',
      '-crf',
      '19',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      temp,
    ],
    { stdio: ['pipe', 'ignore', 'inherit'] },
  )
  const exit = once(proc, 'exit')
  void exit.catch(() => {})
  proc.stdin.on('error', () => {})
  try {
    for (let i = 0; i < frames; i += 8) {
      const times = Array.from(
        { length: Math.min(8, frames - i) },
        (_, n) => (duration * (i + n)) / (frames - 1),
      )
      const images = await p.evaluate(
        (ts) => ts.map((t) => window.anatomyCapture.frame(t, 'jpeg')),
        times,
      )
      const packet = Buffer.concat(images.map(bytes))
      await new Promise((resolve, reject) =>
        proc.stdin.write(packet, (err) => (err ? reject(err) : resolve())),
      )
    }
    proc.stdin.end()
    assert.equal((await exit)[0], 0, 'Encoder failed')
    const probe = JSON.parse(
      execFileSync(
        'ffprobe',
        [
          '-v',
          'error',
          '-select_streams',
          'v:0',
          '-show_entries',
          'stream=nb_frames,width,height,r_frame_rate',
          '-of',
          'json',
          temp,
        ],
        { encoding: 'utf8' },
      ),
    ).streams[0]
    assert.equal(Number(probe.nb_frames), frames)
    assert.equal(probe.width, width)
    assert.equal(probe.height, height)
    assert.equal(probe.r_frame_rate, fps + '/1')
    await rename(temp, dest)
  } finally {
    proc.kill()
    await rm(temp, { force: true })
  }
}
let page,
  errors = []
async function open(id) {
  await page?.close()
  page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && /shader|GL_INVALID|WebGLProgram/.test(message.text()))
      errors.push(message.text())
  })
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(res.status() + ' ' + res.url())
  })
  const dest = new URL(url)
  dest.search = new URLSearchParams({ studio: id, figure: 'anatomy', capture: '1', clean: '1' })
  await page.goto(dest.href, { waitUntil: 'domcontentloaded' })
}
async function ready(id) {
  await page.waitForFunction(
    (key) =>
      !!window.anatomyCapture &&
      document.querySelector('main[data-ready=true]') &&
      document.querySelector('[aria-label=Clip]')?.value === key,
    id,
    { timeout: 60000 },
  )
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )
}
const esc = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
try {
  for (const [i, entry] of batch.entries()) {
    const { id } = entry,
      clip = clips[id]
    errors = []
    try {
      if (v.record) {
        try {
          const receipt = JSON.parse(await readFile(join(work, id + '.json'), 'utf8'))
          await access(fileURL(id, 'jpg'))
          const count = Number(
            execFileSync(
              'ffprobe',
              [
                '-v',
                'error',
                '-select_streams',
                'v:0',
                '-show_entries',
                'stream=nb_frames',
                '-of',
                'default=nk=1:nw=1',
                fileURL(id, 'mp4'),
              ],
              { encoding: 'utf8' },
            ).trim(),
          )
          if (receipt.id === id && receipt.frames === count) {
            results.push(receipt)
            continue
          }
        } catch {}
      }
      if (!page || i % 18 === 0) await open(id)
      else
        await page.locator('[aria-label=Clip]').evaluate((el, id) => {
          el.value = id
          el.dispatchEvent(new Event('change', { bubbles: true }))
        }, id)
      try {
        await ready(id)
      } catch {
        // A recently rebuilt local preview may have served HTML for the previous bundle.
        errors = []
        await open(id)
        await ready(id)
      }
      const duration = await page.evaluate(() => window.anatomyCapture.duration)
      assert.equal(duration, clip.seconds)
      const times = [
        ...new Set([
          0,
          ...clip.phases.map((a) => a[0]),
          ...clip.phases.slice(1).map((p, n) => (p[0] + clip.phases[n][0]) / 2),
          duration * 0.37,
          duration,
        ]),
      ]
      let first,
        peak = 0,
        brightest = 0,
        poster
      for (const time of times) {
        const img = bytes(await page.evaluate((t) => window.anatomyCapture.frame(t, 'jpeg'), time))
        const { data: pixels, targetPixels } = await stagePixels(img, entry.kind)
        brightest = Math.max(brightest, targetPixels)
        first ??= pixels
        const diff = frameDelta(first, pixels)
        if (diff > peak) {
          peak = diff
          poster = img
        }
      }
      assert(peak >= 8, 'The skeleton is stationary throughout the clip')
      assert(brightest >= 5, 'The selected target is hidden in every phase')
      assert.deepEqual(errors, [])
      const frames = Math.max(2, Math.round(duration * fps))
      if (v.record) await encoder(id, page, frames, duration)
      await publish(fileURL(id, 'jpg'), poster)
      const receipt = {
        ...entry,
        poses: times.length,
        changedPixels: peak,
        targetPixels: brightest,
        duration,
        ...(v.record ? { frames } : {}),
      }
      if (v.record) await publish(join(work, id + '.json'), JSON.stringify(receipt))
      results.push(receipt)
    } catch (e) {
      failures.push({ id, reason: String(e.message) })
      console.error(id, e.message)
      await page?.close()
      page = undefined
    }
    if (i % 12 === 11 || i === batch.length - 1)
      console.log(i + 1 + '/' + batch.length + ' guides, ' + failures.length + ' failures')
  }
  const suffix = requested ? 'subset' : 'library'
  await publish(
    join(dir, suffix + '-verification.json'),
    JSON.stringify(
      { revision, width, height, fps, recorded: Boolean(v.record), results, failures },
      null,
      2,
    ),
  )
  if (failures.length) throw Error(failures.length + ' guide renders failed; see ' + dir)
  if (!requested && v.record) {
    await copyFile('public/models/ATTRIBUTION.md', join(dir, 'CREDITS.md'))
    const items = results
      .map(
        (g) =>
          '<article data-kind="' +
          g.kind +
          '"><a href="' +
          g.id +
          '.mp4"><img loading="lazy" width="320" height="180" alt="" src="' +
          g.id +
          '.jpg"><strong>' +
          esc(g.name) +
          '</strong></a></article>',
      )
      .join('')
    await publish(
      join(dir, 'index.html'),
      '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Anatomy Explorer · Movement library</title><style>*{box-sizing:border-box}body{font:16px system-ui;color:#203f40;background:#f6f4ef;max-width:1400px;margin:auto;padding:28px}h1{margin-bottom:6px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:18px;margin-top:22px}a{color:inherit}article a{text-decoration:none}img{display:block;width:100%;height:auto;border-radius:12px;margin-bottom:8px}input,select{padding:9px 12px;font:inherit}label{display:inline-block;margin:8px 8px 0 0}</style><h1>Movement library</h1><p>163 stretches and 26 nerve glides. Select a movement to play the skeleton recording with its highlighted muscles or nerves. These are unreviewed educational demonstrations. <a href="CREDITS.md">Credits</a></p><label>Find a movement <input id="q" type="search"></label><label>Show <select id="kind"><option value="">All movements</option><option value="stretch">Stretches</option><option value="glide">Nerve glides</option></select></label><main>' +
        items +
        '</main><script>function filter(){for(const el of document.querySelectorAll("article"))el.hidden=!(el.textContent.toLowerCase().includes(q.value.toLowerCase())&&(!kind.value||kind.value===el.dataset.kind))}q.oninput=kind.onchange=filter</script></html>',
    )
  }
  console.log(dir)
} finally {
  await browser.close()
  await server?.close()
}
