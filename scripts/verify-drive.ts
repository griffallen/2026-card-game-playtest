/* Two-player end-to-end drive through the real UI. */
import { chromium, type Page } from 'playwright-core'

const BASE = 'http://localhost:3000'
const SHOTS = '/private/tmp/claude-501/-Users-blaine-workspace-2026-card-game/ebeacc3f-5301-4623-9700-484a9d5aea64/scratchpad'
const stamp = Date.now().toString(36).slice(-5)

async function registerAndEnter(page: Page, name: string) {
  await page.goto(`${BASE}/register`)
  await page.getByPlaceholder('lowercase, 3–24 chars').fill(name)
  await page.getByPlaceholder('at least 8 characters').fill('password123')
  await page.locator('input[type=password]').nth(1).fill('password123')
  await page.getByRole('button', { name: 'Join the game' }).click()
  await page.waitForURL(`${BASE}/`)
}

async function tryAct(page: Page): Promise<string> {
  // v2 intercept window (decision 42): let the assault through to keep the drive moving
  const letThrough = page.getByRole('button', { name: /Let it through/ })
  if (await letThrough.isVisible().catch(() => false)) { await letThrough.click(); return 'declined intercept' }
  // setup phase (decision 31): pick 2 starting banks, confirm
  const bank2 = page.getByRole('button', { name: /Bank these/ })
  if (await bank2.isVisible().catch(() => false)) {
    const cards = page.locator('.overflow-x-auto > div.shrink-0')
    if (await cards.count() >= 2) { await cards.nth(0).click(); await cards.nth(1).click() }
    await page.waitForTimeout(120)
    if (await bank2.isEnabled().catch(() => false)) await bank2.click()
    return 'setup banked'
  }
  // bank start-step (v2): bank the first hand card if possible, else keep hand (skip)
  const keep = page.getByRole('button', { name: /Keep hand/ })
  if (await keep.isVisible().catch(() => false)) {
    const hand = page.locator('.overflow-x-auto > div.shrink-0').first()
    if (await hand.isVisible().catch(() => false)) {
      await hand.click()
      const bank = page.getByRole('button', { name: 'Bank as resource' })
      if (await bank.isVisible().catch(() => false)) { await bank.click(); return 'banked' }
    }
    await keep.click()
    return 'kept hand'
  }
  // action loop: try to play a card, else pass
  const pass = page.getByRole('button', { name: 'Pass', exact: true })
  if (!(await pass.isVisible().catch(() => false))) return 'not my window'
  const cards = page.locator('.overflow-x-auto > div.shrink-0:not(.opacity-45)')
  const n = await cards.count()
  for (let i = 0; i < Math.min(n, 4); i++) {
    await cards.nth(i).click()
    const play = page.getByRole('button', { name: /^Play \(/ })
    if (await play.isVisible().catch(() => false)) {
      await play.click()
      await page.waitForTimeout(250)
      // targeting? click the first glowing target if one appeared
      const target = page.locator('.glow-target, .glow').first()
      if (await target.isVisible().catch(() => false)) {
        await target.click()
        await page.waitForTimeout(250)
        const second = page.locator('.glow-target, .glow').first()
        if (await second.isVisible().catch(() => false)) await second.click()
      }
      return `played card ${i}`
    }
    await page.keyboard.press('Escape')
  }
  await pass.click()
  return 'passed'
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const a = await ctxA.newPage()
  const b = await ctxB.newPage()
  const errors: string[] = []
  for (const [tag, p] of [['A', a], ['B', b]] as const) {
    p.on('console', m => m.type() === 'error' && errors.push(`[${tag}] console: ${m.text()}`))
    p.on('pageerror', e => errors.push(`[${tag}] pageerror: ${e.message}`))
  }

  // login screenshot before registering
  await a.goto(`${BASE}/login`)
  await a.screenshot({ path: `${SHOTS}/shot-login.png` })

  await registerAndEnter(a, `blaze${stamp}`)
  await registerAndEnter(b, `sunny${stamp}`)

  // A creates a table with the red deck
  await a.getByRole('button', { name: /New table/ }).click()
  await a.getByPlaceholder(/table$/).fill('proving grounds')
  await a.getByText('Crimson Assault').click()
  await a.screenshot({ path: `${SHOTS}/shot-create.png` })
  await a.getByRole('button', { name: 'Open table' }).click()
  await a.waitForURL(/\/game\//)
  const gameUrl = a.url()
  console.log('game:', gameUrl)

  // B joins with the yellow deck
  await b.goto(`${BASE}/`)
  await b.getByRole('button', { name: 'Join', exact: true }).first().click()
  await b.getByText('Radiant Order').click()
  await b.getByRole('button', { name: 'Take your seat' }).click()
  await b.waitForURL(/\/game\//)

  await a.waitForTimeout(800)
  await a.screenshot({ path: `${SHOTS}/shot-table-start.png` })

  // play a while: whoever's window it is acts (setup/bank/intercept all handled inside tryAct, per page)
  let acts = 0
  for (let i = 0; i < 80 && acts < 30; i++) {
    for (const p of [a, b]) {
      const what = await tryAct(p)
      if (what !== 'not my window') {
        acts++
        console.log(`act ${acts}: ${what}`)
        await p.waitForTimeout(300)
      }
    }
  }

  await a.waitForTimeout(600)
  await a.screenshot({ path: `${SHOTS}/shot-table-host.png` })
  await b.screenshot({ path: `${SHOTS}/shot-table-guest.png` })

  // spectator + cards + admin views
  await b.goto(`${BASE}/cards`)
  await b.waitForTimeout(700)
  await b.screenshot({ path: `${SHOTS}/shot-cards.png` })

  console.log('page errors:', errors.length ? errors.slice(0, 8) : 'none')
  await browser.close()
}

main().catch(e => { console.error('DRIVE FAILED:', e.message); process.exit(1) })
