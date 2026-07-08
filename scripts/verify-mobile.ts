/* Mobile viewport probe against the live demo: portrait phone, landscape phone, tablet. */
import { chromium } from 'playwright-core'

const BASE = process.env.DEMO_URL ?? 'https://blainebooher.com/new-game-demo'
const SHOTS = '/private/tmp/claude-501/-Users-blaine-workspace-2026-card-game/ebeacc3f-5301-4623-9700-484a9d5aea64/scratchpad'

const VIEWPORTS = [
  { name: 'phone-portrait', width: 390, height: 844 },   // iPhone 14-ish
  { name: 'phone-landscape', width: 844, height: 390 },
  { name: 'tablet', width: 1024, height: 768 },          // iPad landscape
]

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: true,
      isMobile: vp.width < 1000,
    })
    await page.goto(`${BASE}/#/play`)
    await page.getByText('You vs the AI').click()
    await page.getByPlaceholder('random').fill('42')
    await page.getByRole('button', { name: /Begin/ }).click()
    await page.waitForTimeout(2500) // let the AI take its early window if it goes first

    // try one interaction: bank a card if it's our resource step
    const hand = page.locator('.overflow-x-auto > div.shrink-0').first()
    if (await hand.isVisible().catch(() => false)) {
      await hand.tap().catch(() => hand.click())
      await page.waitForTimeout(300)
      const bank = page.getByRole('button', { name: 'Bank as resource' })
      if (await bank.isVisible().catch(() => false)) await bank.click()
    }
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SHOTS}/mobile-${vp.name}.png` })
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    console.log(`${vp.name} (${vp.width}×${vp.height}): horizontal page overflow = ${overflowX}`)
    await page.close()
  }
  await browser.close()
}

main().catch(e => { console.error('MOBILE PROBE FAILED:', e.message); process.exit(1) })
