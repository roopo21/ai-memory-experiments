import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { launchBrowser, localStudio } from '../asset-pipeline/motion/browser.mjs'

const server = process.env.STUDIO_URL ? null : await localStudio(),
  url = process.env.STUDIO_URL ?? server.url
const browser = await launchBrowser()
const errors = []
const context = await browser.newContext({
  viewport: { width: 1280, height: 760 },
  reducedMotion: 'reduce',
})
const page = await context.newPage()
page.on('pageerror', (e) => errors.push(e.message))
const button = (name) => page.getByRole('button', { name, exact: true }),
  selectClip = (id) => page.getByLabel('Clip', { exact: true }).selectOption(id)
const ready = () => page.waitForSelector('[data-ready=true]', { timeout: 90000 })
const still = async () =>
  assert.equal(await page.getByLabel('Timeline', { exact: true }).inputValue(), '0')
async function until(test) {
  await page.waitForFunction(test, undefined, { timeout: 20000 })
}
try {
  await page.goto(url + '/#mode=stretch&parts=hamstrings&exercise=supine-hamstring', {
    waitUntil: 'domcontentloaded',
  })
  await button('Preview movement in studio').click()
  await ready()
  await still()
  assert.equal(await page.getByLabel('Clip', { exact: true }).inputValue(), 'supine-hamstring')
  await button('Straighten and hold').click()
  await button('Human').click()
  await ready()
  assert.equal(await page.getByLabel('Timeline', { exact: true }).inputValue(), '2.5')
  await button('Right').click()
  await ready()
  await still()
  await button('Play').click()
  await until(() => Number(document.querySelector('[aria-label=Timeline]').value) > 0.08)
  await button('Pause').click()
  const t = await page.getByLabel('Timeline', { exact: true }).inputValue()
  await button('Skeleton').click()
  await ready()
  assert.equal(await page.getByLabel('Timeline', { exact: true }).inputValue(), t)
  await page.getByLabel('Camera angle').selectOption('Side')
  await button('Frame movement').click()
  await button('Clean view').click()
  await page.waitForSelector('[data-clean=true]')
  assert.equal(await page.locator('button:visible').count(), 0)
  await until(() => {
    const b = document.querySelector('canvas').getBoundingClientRect()
    return Math.abs(b.height - innerHeight) <= 1 && Math.abs(b.width - innerWidth) <= 1
  })
  await page.keyboard.press('Home')
  await page.keyboard.press('Space')
  await page.waitForTimeout(180)
  await page.keyboard.press('Space')
  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-clean=false]')
  await button('Anatomy Explorer').click()
  await button('Preview movement in studio').waitFor()
  assert(page.url().includes('exercise=supine-hamstring') && !page.url().includes('studio='))
  await button('Preview movement in studio').click()
  await ready()
  await selectClip('push-up')
  await ready()
  await page
    .getByLabel('Describe a movement')
    .fill('Show a push-up with a human and skeleton from the side')
  await button('Set up movement').click()
  await ready()
  assert.equal(await button('Both').getAttribute('aria-pressed'), 'true')
  await button('Targets').click()
  await ready()
  await page.getByLabel('Full-resolution anatomy').check()
  await ready()
  await button('Bottom').click()
  await page.getByLabel('Full-resolution anatomy').uncheck()
  await ready()
  await button('Edit a keyframe copy').click()
  await ready()
  assert.equal(await page.getByLabel('Clip', { exact: true }).inputValue(), 'custom')
  await page.getByLabel('Motion cue').fill('At 2s bend both elbows 85')
  await button('Apply cue').click()
  await page.getByLabel('Joint', { exact: true }).selectOption('rightForearm')
  assert.equal(await page.getByLabel('Joint X degrees').inputValue(), '-85')
  await page.getByLabel('Motion cue').fill('At 2s grow wings')
  await button('Apply cue').click()
  assert.match((await page.getByRole('alert').allTextContents()).join(' '), /Supported cues/)
  const project = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('anatomy-explorer.motion.v1')),
  )
  const fresh = {
    version: 1,
    name: 'Browser test curl',
    plantFeet: false,
    frames: [
      { time: 0, label: 'Start', root: [0, 0, 0], angles: {} },
      { time: 1, label: 'Bend', root: [0, 0, 0], angles: { leftForearm: [-90, 0, 0] } },
    ],
  }
  await page
    .getByLabel('Motion JSON')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{') })
  await page.getByText('Error: The motion file must contain valid JSON.').waitFor()
  assert.deepEqual(
    await page.evaluate(() => JSON.parse(localStorage.getItem('anatomy-explorer.motion.v1'))),
    project,
  )
  await page.getByLabel('Motion JSON').setInputFiles({
    name: 'test.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fresh)),
  })
  await page.getByText('Hand and foot anchors', { exact: false }).click()
  await button('Lock at this pose').click()
  await page.getByLabel('Anchor X').waitFor()
  await page.getByLabel('Lock until').fill('0.8')
  await button('Release anchor').click()
  await page.getByLabel('Highlight').selectOption('stretch/biceps')
  await ready()
  const saved = page.waitForEvent('download')
  await button('Download motion').click()
  const file = await saved
  const exported = JSON.parse(await readFile(await file.path(), 'utf8'))
  assert.equal(exported.name, fresh.name)
  await button('Check floor and foot locks').click()
  await page.getByText('Joint and floor landmarks passed at 60 samples per second.').waitFor()
  await page.reload()
  await ready()
  assert.equal(await page.getByLabel('Motion name').inputValue(), fresh.name)
  if (await button('Record one take').count()) {
    const result = page.waitForEvent('download', { timeout: 60000 })
    await button('Record one take').click()
    await page.waitForSelector('[data-recording=true][data-clean=true]')
    const download = await result
    const data = await readFile(await download.path())
    assert(data.length > 2000)
    assert(/\.(mp4|webm)$/.test(download.suggestedFilename()))
    assert.equal(await page.getByLabel('Timeline', { exact: true }).inputValue(), '1')
  }
  await page.setViewportSize({ width: 320, height: 640 })
  await selectClip('sciatic-slider-seated')
  await ready()
  await button('Right').click()
  await ready()
  await button('Extend and look up').click()
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await button('Clean view').click()
  await page.waitForSelector('[data-clean=true]')
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 740, height: 360 })
  await ready()
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.setViewportSize({ width: 1000, height: 680 })
  await selectClip('push-up')
  await ready()
  for (let i = 0; i < 20; i++) {
    await button(i % 2 ? 'Targets' : 'Human').click()
    await ready()
    await button('Play').click()
    await button('Pause').click()
  }
  const lose = await page.evaluate(() => {
    const gl = document.querySelector('canvas').getContext('webgl2')
    const e = gl?.getExtension('WEBGL_lose_context')
    e?.loseContext()
    return Boolean(e)
  })
  if (lose) {
    await page.getByText(/Graphics context lost/).waitFor()
    await button('Reload studio').click()
    await ready()
    await still()
  }
  assert.deepEqual(errors, [])
  console.log(
    'Browser checks passed: guide entry and return, controls, clean stage, both resolutions, editable copy, cues, file round-trip, recording, reduced motion, narrow and landscape layouts, 20 swaps and context recovery. ' +
      (await browser.version()),
  )
} finally {
  await context.close()
  await browser.close()
  await server?.close()
}
