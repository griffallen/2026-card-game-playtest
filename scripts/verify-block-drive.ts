/* DEV-ONLY driver for issue #58's spatial block modal. Boots against `vite dev` serving the
 * demo, loads the dev-only /block-verify.html harness (a real v3 block window on the human's
 * base), then exercises the modal — drag-assign, click-assign, gang, explicit wave-through,
 * confirm — capturing a screenshot at each step and asserting the resolved combat log names the
 * real per-pair sources (the #58 correctness property). Not shipped; run manually:
 *   npx vite --port 5178 --strictPort -c apps/demo/vite.config.ts apps/demo &
 *   SHOTS=/path/to/scratchpad npx tsx scripts/verify-block-drive.ts               */
import { chromium, type Page } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:5178'
const SHOTS = process.env.SHOTS ?? '.'

const shot = (p: Page, name: string) => p.screenshot({ path: `${SHOTS}/${name}.png` })
const box = async (p: Page, sel: string) => {
  const b = await p.locator(sel).first().boundingBox()
  if (!b) throw new Error(`no box for ${sel}`)
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

async function drag(p: Page, fromSel: string, toSel: string) {
  const a = await box(p, fromSel), b = await box(p, toSel)
  await p.mouse.move(a.x, a.y)
  await p.mouse.down()
  // step across so the >6px move-threshold trips and the drop slot registers hover
  await p.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 8 })
  await p.mouse.move(b.x, b.y, { steps: 8 })
  return { release: async () => { await p.mouse.up() } }
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message))

  await page.goto(`${BASE}/block-verify.html`)
  await page.getByText('assign your blockers').waitFor({ timeout: 10_000 })
  await page.waitForTimeout(400)

  // (a) the pop-up: incoming attackers laid out with empty slots beneath
  await shot(page, 'block-a-popup')
  console.log('(a) modal open — attackers shown')

  // (b) assign a defender to an attacker BY DRAG (proves the drag path), capturing the ghost mid-drag
  const d = await drag(page, '[data-def-id="DEF_1"]', '[data-atk-slot="ATK_A"]')
  await shot(page, 'block-b1-mid-drag')          // floating ghost following the pointer
  await d.release()
  await page.waitForTimeout(250)
  const pooledAfterDrag = await page.locator('[data-def-id="DEF_1"]').count()
  console.log('(b) drag-assigned DEF_1 → Behemoth; DEF_1 still in pool?', pooledAfterDrag)
  await shot(page, 'block-b2-assigned')

  // (c) gang: a SECOND defender under the same attacker, click-to-assign this time
  await page.locator('[data-def-id="DEF_2"]').click()
  await page.locator('[data-atk-slot="ATK_A"]').click()
  await page.waitForTimeout(200)
  await shot(page, 'block-c-gang')
  console.log('(c) click-assigned DEF_2 → Behemoth (gang of 2)')

  // peek: hide the modal to see the whole board, then return — the partial assignment must survive
  await page.getByRole('button', { name: /View board/ }).click()
  await page.waitForTimeout(300)
  const headerWhilePeeking = await page.getByText('assign your blockers').count()
  const backBtnVisible = await page.getByRole('button', { name: /Back to blocking/ }).isVisible()
  console.log('while peeking — modal header present?', headerWhilePeeking, '| back control visible?', backBtnVisible)
  await shot(page, 'block-peek-board-view')
  await page.getByRole('button', { name: /Back to blocking/ }).click()
  await page.waitForTimeout(300)
  const headerRestored = await page.getByText('assign your blockers').count()
  const confirmLabel = await page.locator('[data-block-confirm]').innerText()
  const def1StillAssigned = (await page.locator('[data-def-id="DEF_1"]').count()) === 0
  const def2StillAssigned = (await page.locator('[data-def-id="DEF_2"]').count()) === 0
  console.log('after back — modal restored?', headerRestored, '| confirm label:', JSON.stringify(confirmLabel),
    '| gang intact (DEF_1 & DEF_2 still assigned)?', def1StillAssigned && def2StillAssigned)
  await shot(page, 'block-peek-restored')

  // (d) explicit wave-through: block Warcry, then wave it past to the base; life-loss preview shows
  await page.locator('[data-def-id="DEF_3"]').click()
  await page.locator('[data-atk-slot="ATK_B"]').click()
  await page.waitForTimeout(150)
  await page.locator('[data-wave-through="ATK_B"]').click()
  await page.waitForTimeout(200)
  const backInPool = await page.locator('[data-def-id="DEF_3"]').count()
  console.log('(d) waved Warcry through; DEF_3 back in pool?', backInPool)
  await shot(page, 'block-d-waved-through')

  // (e) confirm → the real engine resolves; assert the log names real per-pair sources
  await page.locator('[data-block-confirm]').click()
  await page.waitForTimeout(600)
  await shot(page, 'block-e-log')
  const log = await page.locator('body').innerText()
  const checks = {
    'peek hides the modal': headerWhilePeeking === 0 && backBtnVisible,
    'back restores the modal': headerRestored === 1,
    'assignments survive the peek': def1StillAssigned && def2StillAssigned && /block with 2/.test(confirmLabel),
    'per-pair source (Behemoth)': /takes \d+ damage from Crimson Behemoth/.test(log),
    'combined counter names both blockers': /Crimson Behemoth takes \d+ damage from Noble Purifier \+ Exemplar Knight/.test(log),
    'waved attacker hit the base': /from Warcry Leader/.test(log),
    'behemoth destroyed': /Crimson Behemoth is destroyed/.test(log),
  }
  console.log('LOG CHECKS:', JSON.stringify(checks, null, 2))
  await browser.close()
  const ok = Object.values(checks).every(Boolean)
  console.log(ok ? 'ALL LOG CHECKS PASSED' : 'SOME LOG CHECKS FAILED')
  process.exit(ok ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
