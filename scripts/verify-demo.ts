/* Drive the static demo build: play vs AI, run a simulation, open the audit. */
import { chromium } from 'playwright-core'

const BASE = process.env.DEMO_URL ?? 'http://localhost:4173'
const SHOTS = '/private/tmp/claude-501/-Users-blaine-workspace-2026-card-game/ebeacc3f-5301-4623-9700-484a9d5aea64/scratchpad'

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors: string[] = []
  page.on('console', m => m.type() === 'error' && errors.push(`console: ${m.text()}`))
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))

  // ── Play vs AI ──
  await page.goto(`${BASE}/#/play`)
  await page.getByText('You vs the AI').click()
  await page.getByPlaceholder('random').fill('42')
  await page.screenshot({ path: `${SHOTS}/demo-setup.png` })
  await page.getByRole('button', { name: /Begin/ }).click()
  await page.waitForTimeout(600)

  // act for ~14 windows; the AI moves on its own between our actions
  for (let i = 0; i < 40; i++) {
    // setup phase (decision 31): pick 2 cards, confirm
    const bank2 = page.getByRole('button', { name: /Bank these/ })
    if (await bank2.isVisible().catch(() => false)) {
      const cards = page.locator('.overflow-x-auto > div.shrink-0')
      if (await cards.count() >= 2) { await cards.nth(0).click(); await cards.nth(1).click() }
      await page.waitForTimeout(150)
      if (await bank2.isEnabled().catch(() => false)) await bank2.click()
      await page.waitForTimeout(300)
      continue
    }

    const keep = page.getByRole('button', { name: /Keep hand/ })
    const pass = page.getByRole('button', { name: 'Pass', exact: true })
    if (await keep.isVisible().catch(() => false)) {
      const hand = page.locator('.overflow-x-auto > div.shrink-0').first()
      if (await hand.isVisible().catch(() => false)) {
        await hand.click()
        const bank = page.getByRole('button', { name: 'Bank as resource' })
        if (await bank.isVisible().catch(() => false)) { await bank.click(); continue }
      }
      await keep.click()
    } else if (await pass.isVisible().catch(() => false)) {
      const cards = page.locator('.overflow-x-auto > div.shrink-0:not(.opacity-45)')
      let played = false
      const n = await cards.count()
      for (let c = 0; c < Math.min(n, 3) && !played; c++) {
        await cards.nth(c).click()
        const play = page.getByRole('button', { name: /^Play \(/ })
        if (await play.isVisible().catch(() => false)) {
          await play.click()
          await page.waitForTimeout(250)
          const target = page.locator('.glow-target').first()
          if (await target.isVisible().catch(() => false)) await target.click()
          played = true
        } else await page.keyboard.press('Escape')
      }
      if (!played) await pass.click()
    }
    await page.waitForTimeout(500)
  }
  await page.screenshot({ path: `${SHOTS}/demo-game.png` })
  const turnText = await page.locator('text=/Turn \\d+/').first().textContent().catch(() => 'n/a')
  console.log('vs-AI reached:', turnText)

  // export buttons exist
  console.log('export buttons:', await page.getByRole('button', { name: 'Download game file' }).count(), await page.getByRole('button', { name: 'Copy chronicle' }).count())

  // ── Simulator ──
  await page.goto(`${BASE}/#/simulate`)
  await page.locator('input[type=number]').fill('30')
  await page.getByRole('button', { name: /Run 30 games/ }).click()
  await page.waitForSelector('text=/wins/', { timeout: 120_000 })
  await page.waitForFunction(() => !document.body.textContent?.includes('Stop'), undefined, { timeout: 120_000 })
  await page.screenshot({ path: `${SHOTS}/demo-sim.png` })
  const summary = await page.locator('.panel').nth(1).textContent()
  console.log('sim summary:', summary?.slice(0, 200))

  // ── Audit ──
  await page.goto(`${BASE}/#/audit`)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${SHOTS}/demo-audit.png`, fullPage: false })

  console.log('page errors:', errors.length ? errors.slice(0, 6) : 'none')
  await browser.close()
}

main().catch(e => { console.error('DEMO DRIVE FAILED:', e.message); process.exit(1) })
