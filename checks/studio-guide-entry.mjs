import assert from 'node:assert/strict'
import { launchBrowser, localStudio } from '../asset-pipeline/motion/browser.mjs'
import { exerciseById } from '../src/guides/exercises.ts'
const server = process.env.STUDIO_URL ? null : await localStudio(),
  url = server?.url ?? process.env.STUDIO_URL
const browser = await launchBrowser()
let tested = 0
try {
  for (const kind of ['stretch', 'glide']) {
    let page
    for (const g of exerciseById[kind].values()) {
      // Periodically use a cold document as well as repeated entry, return and hash navigation.
      if (!page || tested % 15 === 0) {
        await page?.close()
        page = await browser.newPage({ viewport: { width: 1100, height: 740 } })
      }
      const h = new URLSearchParams({ mode: kind, parts: g.primary[0], exercise: g.id })
      await page.goto(url + '/#' + h, { waitUntil: 'commit' })
      const card = page.getByRole('region', { name: g.name + ' instructions', exact: true })
      await card.getByRole('button', { name: 'Preview in Motion Lab' }).click()
      await page.waitForSelector('main[data-ready=true]')
      assert.equal(await page.getByLabel('Clip', { exact: true }).inputValue(), g.id)
      assert.equal(
        await page
          .getByRole('button', { name: 'Full body', exact: true })
          .getAttribute('aria-pressed'),
        'true',
      )
      assert.equal(new URL(page.url()).searchParams.get('studio'), g.id)
      await page.getByRole('button', { name: 'Anatomy Explorer', exact: true }).click()
      await card.waitFor()
      assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('exercise'), g.id)
      tested++
    }
    await page?.close()
    console.log(kind + ' cards passed')
  }
  assert.equal(tested, 189)
  console.log(
    tested +
      ' guide cards opened their highlighted atlas demo and returned to the same instructions.',
  )
} finally {
  await browser.close()
  await server?.close()
}
