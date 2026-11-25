import { spawn } from 'node:child_process'
import { motionRevision } from './revision.mjs'
import { access, copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { once } from 'node:events'
import { launchBrowser, localStudio } from './browser.mjs'
import { clips, isClip } from '../../src/studio/clips.ts'
import { readProject } from '../../src/studio/project.ts'

const { values: v } = parseArgs({
  options: Object.fromEntries(
    [
      'clip',
      'figure',
      'side',
      'angle',
      'width',
      'height',
      'fps',
      'output',
      'project',
      'url',
      'detail',
    ].map((k) => [k, { type: k === 'detail' ? 'boolean' : 'string' }]),
  ),
})
const clip = v.clip ?? (v.project ? 'custom' : 'push-up'),
  figure = v.figure ?? 'both',
  side = v.side ?? 'left',
  angle = v.angle ?? 'Teaching'
if (
  !isClip(clip) ||
  !['human', 'anatomy', 'bones', 'both'].includes(figure) ||
  !['left', 'right'].includes(side) ||
  !['Teaching', 'Side', 'Front', 'Back', 'Overhead'].includes(angle)
)
  throw Error('Unknown clip, figure, side or camera angle.')
const project = v.project ? readProject(await readFile(v.project, 'utf8')) : null
if ((clip === 'custom') !== Boolean(project))
  throw Error('Supply --project my.motion.json for a custom clip.')
const width = Number(v.width ?? 1280),
  height = Number(v.height ?? 720),
  fps = Number(v.fps ?? 30)
if (
  ![width, height].every((x) => Number.isInteger(x) && x >= 160 && x <= 3840 && x % 2 === 0) ||
  !Number.isInteger(fps) ||
  fps < 1 ||
  fps > 60
)
  throw Error('Use even dimensions from 160 to 3840 and 1–60 fps.')
if (!v.output) throw Error('Choose a new output directory with --output.')
const dest = resolve(v.output)
await mkdir(dirname(dest), { recursive: true })
try {
  await access(dest)
  throw Error('The output already exists. Choose a new output directory.')
} catch (e) {
  if (e.code !== 'ENOENT') throw e
}
const tmp = await mkdtemp(join(dirname(dest), '.' + basename(dest) + '-'))
let browser,
  server,
  encoder,
  interrupted = false
const abort = () => {
  interrupted = true
  encoder?.kill()
  void browser?.close()
}
process.once('SIGINT', abort)
process.once('SIGTERM', abort)
function ffmpeg(args, pipe = false) {
  encoder = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', ...args], {
    stdio: [pipe ? 'pipe' : 'ignore', 'ignore', 'inherit'],
  })
  const proc = encoder
  const finished = new Promise((res, rej) => {
    proc.once('error', rej)
    proc.once('close', (code) => (code === 0 ? res() : rej(Error('ffmpeg exited with ' + code))))
  })
  void finished.catch(() => {})
  proc.stdin?.on('error', () => {})
  return { proc, finished }
}
try {
  if (!v.url) server = await localStudio()
  browser = await launchBrowser()
  const p = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  if (project)
    await p.addInitScript(
      (obj) => localStorage.setItem('anatomy-explorer.motion.v1', JSON.stringify(obj)),
      project,
    )
  let frames = 0,
    duration = 0
  const figures = figure === 'both' ? ['anatomy', 'human'] : [figure]
  for (const name of figures) {
    if (interrupted) throw Error('Export interrupted.')
    const url = new URL(v.url ?? server.url)
    url.search = new URLSearchParams({
      studio: clip,
      figure: name,
      side,
      angle,
      clean: '1',
      capture: '1',
      detail: v.detail ? '1' : '0',
    })
    await p.goto(url.href, { waitUntil: 'domcontentloaded' })
    await p.waitForFunction(
      () => window.anatomyCapture && document.querySelector('[data-ready=true][data-clean=true]'),
      undefined,
      { timeout: 90000 },
    )
    const meta = await p.evaluate(() => ({
      duration: window.anatomyCapture.duration,
      width: document.querySelector('canvas').width,
      height: document.querySelector('canvas').height,
    }))
    if (meta.width !== width || meta.height !== height)
      throw Error('Canvas dimensions differ from the requested capture.')
    duration = meta.duration
    frames = Math.max(2, Math.round(duration * fps))
    const { proc, finished } = ffmpeg(
      [
        '-f',
        'image2pipe',
        '-framerate',
        String(fps),
        '-vcodec',
        'mjpeg',
        '-i',
        'pipe:0',
        '-an',
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '17',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-metadata',
        'comment=Anatomy Explorer authoring preview. See CREDITS.md.',
        join(tmp, name + '.mp4'),
      ],
      true,
    )
    for (let n = 0; n < frames; n++) {
      const time = (n * duration) / (frames - 1)
      const image = await p.evaluate((t) => window.anatomyCapture.frame(t, 'jpeg'), time)
      const buffer = Buffer.from(image.split(',')[1], 'base64')
      if (proc.exitCode !== null || proc.stdin.destroyed)
        throw Error('Encoder closed during frame ' + n)
      if (!proc.stdin.write(buffer))
        await Promise.race([
          once(proc.stdin, 'drain'),
          finished.then(() => {
            throw Error('Encoder closed early')
          }),
        ])
      if (n === 0 || n === Math.floor(frames / 2) || n === frames - 1)
        await writeFile(
          join(
            tmp,
            name + '-' + (n === 0 ? 'start' : n === frames - 1 ? 'end' : 'middle') + '.jpg',
          ),
          buffer,
        )
    }
    proc.stdin.end()
    await finished
    console.log(name + ': ' + frames + ' frames at ' + fps + ' fps')
  }
  if (figures.length === 2)
    await ffmpeg([
      '-i',
      join(tmp, 'anatomy.mp4'),
      '-i',
      join(tmp, 'human.mp4'),
      '-filter_complex',
      'hstack=inputs=2',
      '-an',
      '-c:v',
      'libx264',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      join(tmp, 'comparison.mp4'),
    ]).finished
  await copyFile('public/models/ATTRIBUTION.md', join(tmp, 'CREDITS.md'))
  await writeFile(
    join(tmp, 'motion.json'),
    JSON.stringify(
      {
        version: 1,
        motionRevision: await motionRevision(),
        clip,
        side,
        angle,
        figures,
        width,
        height,
        detail: Boolean(v.detail),
        duration,
        fps,
        frames,
        phases: project ? project.frames.map((f) => [f.time, f.label]) : clips[clip].phases,
        project,
        clinicalReview: 'unreviewed',
        timing: 'Sample i at duration × i / (frames − 1). Both endpoints included.',
      },
      null,
      2,
    ) + '\n',
  )
  if (interrupted) throw Error('Export interrupted.')
  await rename(tmp, dest)
  console.log(dest)
} finally {
  process.removeListener('SIGINT', abort)
  process.removeListener('SIGTERM', abort)
  encoder?.kill()
  await browser?.close()
  await server?.close()
  await rm(tmp, { force: true, recursive: true })
}
