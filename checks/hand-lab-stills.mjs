/**
 * Render Hand Lab contact sheets: one gesture per sheet, one row per camera view, one column per
 * key moment. Stills only, never video.
 *
 *   npm run stills:hands -- --gestures fist,thumbs-up --output /tmp/hands
 *   npm run stills:hands -- --gestures fist --iterate docs/iterations/hands   # writes NN.png
 *   npm run stills:hands -- --gestures fist --views palm,thumb --times 0,0.5 --figure both
 */
import assert from 'node:assert/strict'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import sharp from 'sharp'
import { localStudio, launchBrowser } from '../asset-pipeline/motion/browser.mjs'

const { values: v } = parseArgs({
  options: {
    gestures: { type: 'string' },
    views: { type: 'string', default: 'front,side,top,low,palm,back' },
    times: { type: 'string' },
    figure: { type: 'string', default: 'tissue' },
    side: { type: 'string', default: 'left' },
    width: { type: 'string', default: '360' },
    height: { type: 'string', default: '300' },
    output: { type: 'string' },
    iterate: { type: 'string' },
    fov: { type: 'string', default: '32' },
    cols: { type: 'string', default: '3' },
    montage: { type: 'string' },
    url: { type: 'string' },
  },
})
assert(v.gestures, 'Pass --gestures <id,id>')
assert(v.output || v.iterate, 'Pass --output <folder> or --iterate <folder>')
const width = Number(v.width),
  height = Number(v.height),
  caption = 22
const pool = []
const views = v.views.split(','),
  ids = v.gestures.split(',')
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
const label = (text, w, h, size = 14, weight = 500) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#111113"/><text x="8" y="${Math.round(h * 0.7)}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="#e9e9ec">${esc(text)}</text></svg>`,
  )
const server = v.url ? null : await localStudio(),
  base = v.url ?? server.url,
  browser = await launchBrowser()
const bytes = (data) => Buffer.from(data.substring(data.indexOf(',') + 1), 'base64')
let page
try {
  page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => console.error('page error', e.message))
  page.on('console', (m) => m.type() === 'error' && console.error('console', m.text()))
  const dest = new URL(base)
  dest.search = new URLSearchParams({ handlab: ids[0], capture: '1', side: v.side })
  await page.goto(dest.href, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => !!window.handLab && document.querySelector('main[data-ready=true]'),
    null,
    { timeout: 120000 },
  )
  for (const id of ids) {
    const info = await page.evaluate((g) => window.handLab.info(g), id)
    assert(info, 'Unknown gesture ' + id)
    const marks = v.times
      ? v.times.split(',').map((t) => [Number(t), t + ' s'])
      : info.moments.map((m) => [m.t, m.label])
    const frames = []
    const notes = []
    for (const view of views)
      for (const [t, name] of marks) {
        const img = bytes(
          await page.evaluate(
            (o) => window.handLab.frame(o),
            { gesture: id, t, view, figure: v.figure, side: v.side === 'right' ? -1 : 1, fov: Number(v.fov) },
          ),
        )
        notes.push(await page.evaluate(() => window.handLab.notes()))
        frames.push(
          await sharp({
            create: { width, height: height + caption, channels: 3, background: '#111113' },
          })
            .composite([
              { input: label(`${id} · ${view} · ${name}`, width, caption, 13, 400), top: 0, left: 0 },
              { input: await sharp(img).resize(width, height).toBuffer(), top: caption, left: 0 },
            ])
            .png()
            .toBuffer(),
        )
      }
    pool.push(...frames)
    const cols = Math.min(Number(v.cols), frames.length),
      rowH = height + caption + 4,
      w = cols * (width + 4),
      h = 28 + Math.ceil(frames.length / cols) * rowH
    const sheet = await sharp({ create: { width: w, height: h, channels: 3, background: '#111113' } })
      .composite([
        { input: label(`${info.name}  (${id}, ${v.side} hand, ${v.figure})`, w, 28, 16, 700), top: 0, left: 0 },
        ...frames.map((f, n) => ({
          input: f,
          top: 28 + Math.floor(n / cols) * rowH,
          left: (n % cols) * (width + 4),
        })),
      ])
      .png({ palette: true, quality: 82, compressionLevel: 9 })
      .toBuffer()
    let file
    if (v.iterate) {
      const dir = resolve(v.iterate, id)
      await mkdir(dir, { recursive: true })
      const n = (await readdir(dir)).filter((f) => /^\d+\.png$/.test(f)).length + 1
      file = join(dir, String(n).padStart(2, '0') + '.png')
    } else {
      await mkdir(resolve(v.output), { recursive: true })
      file = join(resolve(v.output), id + '.png')
    }
    if (!v.montage) {
      await writeFile(file, sheet)
      console.log(file)
    }
    if (notes.some(Boolean)) console.log(JSON.stringify(notes.filter(Boolean).slice(0, marks.length)))
  }
  if (v.montage) {
    const cols = Number(v.cols),
      rowH = height + caption + 4
    const sheet = await sharp({
      create: { width: cols * (width + 4), height: Math.ceil(pool.length / cols) * rowH, channels: 3, background: '#111113' },
    })
      .composite(pool.map((f, n) => ({ input: f, top: Math.floor(n / cols) * rowH, left: (n % cols) * (width + 4) })))
      .png({ palette: true, quality: 82, compressionLevel: 9 })
      .toBuffer()
    await mkdir(resolve(v.output ?? v.iterate), { recursive: true })
    let file = join(resolve(v.output ?? v.iterate), v.montage + '.png')
    if (v.iterate) {
      const dir = resolve(v.iterate, v.montage)
      await mkdir(dir, { recursive: true })
      const n = (await readdir(dir)).filter((f) => /^\d+\.png$/.test(f)).length + 1
      file = join(dir, String(n).padStart(2, '0') + '.png')
    }
    await writeFile(file, sheet)
    console.log(file)
  }
} finally {
  await page?.close()
  await browser.close()
  await server?.close()
}
