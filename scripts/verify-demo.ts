/* Drive the static demo build: play vs AI (v3 block windows + v2 intercept/bank steps),
   run a simulation, open the audit. Proves the shipped bundle plays a full game with no errors.
   Deploy gate: deploy-demo.sh runs this against the freshly built dist and aborts on failure. */
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright-core'

const BASE = process.env.DEMO_URL ?? 'http://localhost:4173'
const SHOTS = process.env.SHOTS_DIR ?? `${tmpdir()}/demo-verify-shots`
mkdirSync(SHOTS, { recursive: true })

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors: string[] = []
  page.on('console', m => m.type() === 'error' && errors.push(`console: ${m.text()}`))
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
  const vis = (name: RegExp | string, exact = false) => {
    const l = typeof name === 'string' ? page.getByRole('button', { name, exact }) : page.getByRole('button', { name })
    return l.isVisible().catch(() => false).then(v => (v ? l : null))
  }

  // ── Play vs AI ──
  await page.goto(`${BASE}/#/play`)
  await page.getByText('You vs the AI').click()
  await page.getByPlaceholder('random').fill('42')
  await page.screenshot({ path: `${SHOTS}/demo-setup.png` })
  await page.getByRole('button', { name: /Begin/ }).click()
  // hard gate: the table must render (a crash here unmounts to a blank #root — issue #18)
  await page.waitForSelector('text=/Round \\d+/', { timeout: 8_000 })
    .catch(() => { throw new Error('game table never rendered after Begin — blank screen') })
  await page.waitForTimeout(600)

  // Drive the human seat: answer intercepts, clear the setup/bank steps, then act (play → target, else pass).
  // The AI auto-plays its own windows on a timer between ours.
  let intercepts = 0, maxRound = 1, won = false
  for (let i = 0; i < 80 && !won; i++) {
    won = await page.getByText(/wins —|Rematch|Play again/i).first().isVisible().catch(() => false)
    if (won) break

    // #42: a combat recap holds the AI until read — tap it through like an impatient human
    // (the ack variant, "your losses", holds indefinitely until dismissed)
    const recapPanel = await vis(/⚔ combat|☠ your losses/)
    if (recapPanel) { await recapPanel.click().catch(() => {}); await page.waitForTimeout(120); continue }

    // v2 intercept window (decision 42): let the assault through to keep the drive moving
    const letThrough = await vis(/Let it through/)
    if (letThrough) { intercepts++; await letThrough.click(); await page.waitForTimeout(200); continue }

    // #27: a round-ending pass with actions left asks for confirmation — the bot is always sure
    const endRound = await vis(/End the round/)
    if (endRound) { await endRound.click(); await page.waitForTimeout(200); continue }

    // setup phase (decision 31, hotseat only — vs-AI is zero-input): pick 2, confirm
    const bank2 = await vis(/Bank these/)
    if (bank2) {
      const cards = page.locator('.overflow-x-auto > div.shrink-0')
      if (await cards.count() >= 2) { await cards.nth(0).click(); await cards.nth(1).click() }
      await page.waitForTimeout(120)
      if (await bank2.isEnabled().catch(() => false)) await bank2.click()
      await page.waitForTimeout(250); continue
    }

    // v2 bank start-step: skip banking to enter the action loop
    const skipBank = await vis(/Skip banking/)
    if (skipBank) { await skipBank.click(); await page.waitForTimeout(200); continue }

    // action loop: try to play a card with a target; else pass
    const pass = await vis('Pass', true)
    if (pass) {
      const cards = page.locator('.overflow-x-auto > div.shrink-0:not(.opacity-45)')
      let acted = false
      const n = await cards.count()
      for (let c = 0; c < Math.min(n, 3) && !acted; c++) {
        await cards.nth(c).click()
        const play = await vis(/^Play \(/)
        if (play) {
          await play.click(); await page.waitForTimeout(150)
          const target = page.locator('.glow-target, .glow').first()
          if (await target.isVisible().catch(() => false)) await target.click()
          acted = true
        } else await page.keyboard.press('Escape')
      }
      if (!acted) await pass.click()
    }
    // track the live round ("Round N — …'s window"), not the static "Round 1 · seed" header
    const live = await page.locator('text=/Round \\d+ —/').first().textContent().catch(() => '')
    const m = live?.match(/Round (\d+)/)
    if (m) maxRound = Math.max(maxRound, Number(m[1]))
    await page.waitForTimeout(350)
  }
  await page.screenshot({ path: `${SHOTS}/demo-game.png` })
  console.log(`vs-AI drive: reached round ${maxRound}, intercept windows answered ${intercepts}, game ${won ? 'ended with a winner' : 'in progress'}`)

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
  console.log('sim summary:', summary?.slice(0, 220))

  // ── Card art (issue #19): every card must show its real art, zero procedural fallbacks ──
  await page.goto(`${BASE}/#/cards`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500) // retry backoff window
  const art = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter(i => (i as HTMLImageElement).src.includes('cards/')) as HTMLImageElement[]
    return {
      loaded: imgs.filter(i => i.complete && i.naturalWidth > 0).length,
      broken: imgs.filter(i => i.complete && i.naturalWidth === 0).length,
      fallbacks: document.querySelectorAll('[data-art="fallback"]').length,
    }
  })
  console.log(`card art: ${art.loaded} loaded, ${art.broken} broken, ${art.fallbacks} fallbacks`)
  if (art.loaded === 0 || art.broken > 0 || art.fallbacks > 0) errors.push(`card art regression: ${JSON.stringify(art)}`)

  // ── Audit ──
  await page.goto(`${BASE}/#/audit`)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${SHOTS}/demo-audit.png`, fullPage: false })

  console.log('page errors:', errors.length ? errors.slice(0, 6) : 'none')
  await browser.close()
  if (errors.length) process.exit(1)
}

main().catch(e => { console.error('DEMO DRIVE FAILED:', e.message); process.exit(1) })
