/* Verify sim→replay faithfulness + step controls on the built demo. */
import { chromium } from 'playwright-core'

const BASE = process.env.DEMO_URL ?? 'http://localhost:4173'
const SHOTS = '/private/tmp/claude-501/-Users-blaine-workspace-2026-card-game/ebeacc3f-5301-4623-9700-484a9d5aea64/scratchpad'

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  // run a small sim batch
  await page.goto(`${BASE}/#/simulate`)
  await page.locator('input[type=number]').fill('4')
  await page.getByRole('button', { name: /Run 4 games/ }).click()
  await page.waitForSelector('table tbody tr', { timeout: 60_000 })
  await page.waitForFunction(() => !document.body.textContent?.includes('Stop'), undefined, { timeout: 60_000 })

  const row = page.locator('table tbody tr').first()
  const cells = await row.locator('td').allTextContents()
  const [seed, first, winner, by, rounds] = cells
  console.log(`sim row: seed=${seed} first=${first} winner=${winner.trim()} by=${by} rounds=${rounds}`)

  // replay it
  await row.getByText('Watch ▶').click()
  await page.waitForSelector('text=/Bot /', { timeout: 10_000 })

  // exercise the transport: pause, step twice, back once
  await page.getByRole('button', { name: /Pause/ }).click()
  const actionCount = async () => Number((await page.locator('text=/^action \\d+$/').textContent())?.replace('action ', ''))
  const before = await actionCount()
  await page.getByRole('button', { name: '▸' }).click()
  await page.waitForTimeout(200)
  const afterStep = await actionCount()
  await page.getByRole('button', { name: '◂' }).click()
  await page.waitForTimeout(200)
  const afterBack = await actionCount()
  console.log(`step check: ${before} → ▸ ${afterStep} → ◂ ${afterBack} (expect +1 then −1)`)
  await page.screenshot({ path: `${SHOTS}/demo-replay-paused.png` })

  // fast-forward to the end
  await page.locator('select[aria-label="playback speed"]').selectOption('fast')
  await page.getByRole('button', { name: /Play/ }).click()
  await page.waitForSelector('text=is victorious', { timeout: 180_000 })
  const verdict = await page.locator('text=is victorious').textContent()
  const detail = await page.locator('text=/Round \\d+ · \\w+ · seed/').textContent()
  console.log(`replay result: ${verdict} | ${detail}`)
  await page.screenshot({ path: `${SHOTS}/demo-replay-end.png` })

  // faithfulness: winner color + turn count + reason must match the sim row
  const replayWinnerColor = verdict?.includes('Crimson') ? 'red' : 'yellow'
  const simWinnerColor = winner.includes('red') ? 'red' : 'yellow'
  const roundsMatch = detail?.includes(`Round ${rounds} `)
  const reasonMatch = detail?.includes(by)
  console.log(`faithful: winner ${replayWinnerColor === simWinnerColor}, rounds ${roundsMatch}, reason ${reasonMatch}`)
  console.log('page errors:', errors.length ? errors : 'none')
  const ok = replayWinnerColor === simWinnerColor && roundsMatch && reasonMatch && afterStep === before + 1 && afterBack === before
  console.log(ok ? 'REPLAY VERIFY: PASS' : 'REPLAY VERIFY: FAIL')
  await browser.close()
  process.exit(ok ? 0 : 1)
}

main().catch(e => { console.error('REPLAY DRIVE FAILED:', e.message); process.exit(1) })
