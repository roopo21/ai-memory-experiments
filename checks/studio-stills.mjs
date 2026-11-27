/**
 * Render labelled still frames of the guide demonstrations into contact sheets for form review.
 * Stills only: this never records or encodes video.
 *
 *   npm run stills:guides -- --output /tmp/sheets --only wrist-flexor-stretch,median-slider
 *   npm run stills:guides -- --output /tmp/sheets --kind glide --angle Side
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import sharp from 'sharp'
import { clips } from '../src/studio/clips.ts'
import { exerciseById } from '../src/guides/exercises.ts'
import { localStudio, launchBrowser } from '../asset-pipeline/motion/browser.mjs'

const { values: v } = parseArgs({
  options: {
    output: { type: 'string' },
    only: { type: 'string' },
    kind: { type: 'string' },
    angle: { type: 'string', default: 'Teaching' },
    angles: { type: 'string' },
    figure: { type: 'string', default: 'anatomy' },
    hand: { type: 'string' },
    side: { type: 'string', default: 'left' },
    width: { type: 'string', default: '480' },
    height: { type: 'string', default: '300' },
    rows: { type: 'string', default: '5' },
    times: { type: 'string' },
    url: { type: 'string' },
    detail: { type: 'boolean' },
  },
})
assert(v.output, 'Pass --output <folder>')
const dir = resolve(v.output),
  width = Number(v.width),
  height = Number(v.height),
  perSheet = Number(v.rows)
await mkdir(dir, { recursive: true })
const guides = ['stretch', 'glide']
  .filter((k) => !v.kind || v.kind === k)
  .flatMap((kind) =>
    Array.from(exerciseById[kind].values(), (g) => ({ id: g.id, kind, name: g.name })),
  )
const wanted = v.only?.split(',')
const batch = wanted
  ? wanted.map((id) => guides.find((g) => g.id === id) ?? { id, name: id })
  : guides
assert(batch.length, 'No guides selected')
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
const label = (text, w, h, size = 15, weight = 500) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#111113"/><text x="8" y="${Math.round(h * 0.68)}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="#e9e9ec">${esc(text)}</text></svg>`,
  )
const server = v.url ? null : await localStudio(),
  base = v.url ?? server.url,
  browser = await launchBrowser()
const bytes = (data) => Buffer.from(data.substring(data.indexOf(',') + 1), 'base64')
let page
async function open(id, angle) {
  await page?.close()
  page = await browser.newPage({ viewport: { width, height: height + 0 }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => console.error(id, 'page error', e.message))
  const dest = new URL(base)
  dest.search = new URLSearchParams({
    studio: id,
    figure: v.figure,
    capture: '1',
    clean: '1',
    angle,
    side: v.side,
    ...(v.hand ? { handView: v.hand } : {}),
    ...(v.detail ? { detail: '1' } : {}),
  })
  await page.goto(dest.href, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    (key) =>
      !!window.anatomyCapture &&
      document.querySelector('main[data-ready=true]') &&
      document.querySelector('[aria-label=Clip]')?.value === key,
    id,
    { timeout: 90000 },
  )
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  )
}
const rows = []
const caption = 24
try {
  const angles = (v.angles ?? v.angle).split(',')
  for (const [i, g] of batch.entries()) {
    const clip = clips[g.id]
    assert(clip, 'Unknown clip ' + g.id)
    const marks = v.times
      ? v.times.split(',').map((t) => [Number(t), t + ' s'])
      : clip.phases.filter((p, n) => n === 0 || p[1] !== 'Return')
    const frames = []
    for (const angle of angles) {
      await open(g.id, angle)
      for (const [t, name] of marks) {
        const img = bytes(await page.evaluate((s) => window.anatomyCapture.frame(s, 'jpeg'), t))
        if (angle === 'Focus' && g.kind === 'glide' && v.figure === 'anatomy') {
          // Exclude the floor inset. It must not pass a blank or occluded main view.
          const { data, info } = await sharp(img)
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true })
          let cyan = 0
          for (let y = 0; y < info.height; y++)
            for (let x = 0; x < info.width; x++) {
              if (x > info.width * 0.73 && y > info.height * 0.65) continue
              const i = (y * info.width + x) * 3
              const [r, g, b] = data.subarray(i, i + 3)
              if (g > 132 && b > 122 && g > r * 1.25 && b > r * 1.23) cyan++
            }
          assert(cyan >= 12, g.id + ' has no readable cyan nerve at ' + t + ' s')
        }
        const still = await sharp(img).resize(width, height).jpeg({ quality: 88 }).toBuffer()
        frames.push(
          await sharp({
            create: { width, height: height + caption, channels: 3, background: '#111113' },
          })
            .composite([
              {
                input: label(
                  angle + ' · ' + name + ' · ' + Number(t).toFixed(2) + ' s',
                  width,
                  caption,
                  13,
                  400,
                ),
                top: 0,
                left: 0,
              },
              { input: still, top: caption, left: 0 },
            ])
            .jpeg({ quality: 88 })
            .toBuffer(),
        )
      }
    }
    const perRow = marks.length,
      rowsOf = angles.length,
      rowWidth = perRow * (width + 4),
      rowHeight = 30 + rowsOf * (height + caption + 4)
    const row = await sharp({
      create: { width: rowWidth, height: rowHeight, channels: 3, background: '#111113' },
    })
      .composite([
        { input: label(g.name + '  (' + g.id + ')', rowWidth, 30, 17, 700), top: 0, left: 0 },
        ...frames.map((f, n) => ({
          input: f,
          top: 30 + Math.floor(n / perRow) * (height + caption + 4),
          left: (n % perRow) * (width + 4),
        })),
      ])
      .jpeg({ quality: 88 })
      .toBuffer()
    rows.push({ id: g.id, row, width: rowWidth, height: rowHeight })
    await writeFile(join(dir, g.id + '.jpg'), row)
    console.log(i + 1 + '/' + batch.length + ' ' + g.id)
  }
  for (let s = 0; s < rows.length; s += perSheet) {
    const part = rows.slice(s, s + perSheet),
      w = Math.max(...part.map((r) => r.width)),
      h = part.reduce((a, r) => a + r.height + 6, 0)
    let y = 0
    const layers = part.map((r) => {
      const layer = { input: r.row, top: y, left: 0 }
      y += r.height + 6
      return layer
    })
    await sharp({ create: { width: w, height: h, channels: 3, background: '#000000' } })
      .composite(layers)
      .jpeg({ quality: 86 })
      .toFile(join(dir, 'sheet-' + String(s / perSheet + 1).padStart(2, '0') + '.jpg'))
  }
  console.log(dir)
} finally {
  await page?.close()
  await browser.close()
  await server?.close()
}
