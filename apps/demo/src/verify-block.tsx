/* DEV-ONLY verification harness for issue #58's spatial block modal — NOT part of the shipped
 * app (no nav link; vite build only bundles index.html, so this entry never ships). It seeds a
 * genuine v3 GameState that has just reached a multi-attacker block window on the human's base,
 * then hands it to the real <DemoTable> so the modal, the real applyAction, and the real combat
 * log are all exercised end-to-end. Playwright drives /block-verify.html against `vite dev`. */
import { createRoot } from 'react-dom/client'
import {
  createGame, applyAction, V3_RULES, PREBUILT_DECKS, deckSlugs, CARD_SET,
  type GameState, type Seat, type ZoneId, type UnitInstance,
} from '@newgame/engine'
import { DemoTable } from './DemoTable.tsx'
import type { DemoConfig } from './local.ts'
import './index.css'

function craftBlockScenario(): GameState {
  let s = createGame({
    seed: 58,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: CARD_SET,
    players: [
      { name: 'You', deck: deckSlugs(PREBUILT_DECKS[0]) },
      { name: 'The Machine', deck: deckSlugs(PREBUILT_DECKS[1]) },
    ],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state

  const put = (id: string, seat: Seat, slug: string, zone: ZoneId) => {
    s.cardOf[id] = slug
    const def = s.cardSet[slug]
    s.units[id] = {
      id, slug, owner: seat, zone, damage: 0, exhausted: false, enteredRound: 0,
      movedThisRound: false, upgrades: [], mods: [], overextendedBy: 0,
      shielded: (def?.kw ?? []).some(k => k.k === 'shielded'),
    } as UnitInstance
  }
  // seat 0's home is zone 0; a base attack fights in the defender's home zone
  //
  // CONSTRAINT (#132): Crimson Behemoth's onAttack deals 2 damage to every OTHER unit in its zone
  // — ours included — so every defender here must have **3+ health** or it dies before the block
  // window it is meant to exercise. That is exactly how this harness broke: #107 gave the Behemoth
  // its AoE and a balance pass cut Noble Purifier (the old DEF_1) to 4/1, so the driver spent days
  // failing on a defender that was dead on arrival.
  put('ATK_A', 1, 'crimson-behemoth', 0)        // 6/6 — will get ganged; AoEs the zone on attack
  put('ATK_B', 1, 'warcry-leader', 0)           // 4/3 — will be waved through to base
  put('DEF_1', 0, 'champion-of-the-faith', 0)   // 7/7 — its onAttack never fires while blocking
  put('DEF_2', 0, 'exemplar-knight', 0)         // 4/4
  put('DEF_3', 0, 'nightweaver', 0)             // 3/3
  s.phase = 'loop'
  s.actorSeat = 1
  // a real attack action opens the real block window (phase='block', actorSeat=0 = the human)
  s = applyAction(s, { type: 'attack', attackers: ['ATK_A', 'ATK_B'], target: { kind: 'base', seat: 0 } }, 1).state

  // Fail loudly, here, rather than as a mystery timeout in the Playwright driver 40 lines later.
  const lost = ['DEF_1', 'DEF_2', 'DEF_3'].filter(id => !s.units[id])
  if (lost.length) {
    throw new Error(
      `block-verify fixture is stale: ${lost.join(', ')} died before the block window. ` +
      'A card in this scenario was rebalanced — check the defenders still survive 2 AoE damage.',
    )
  }
  return s
}

const config: DemoConfig = {
  mode: 'vs-ai', deckA: PREBUILT_DECKS[0].slug, deckB: PREBUILT_DECKS[1].slug,
  seed: 58, nameA: 'You', nameB: 'The Machine',
  policyA: 'heuristic', policyB: 'heuristic', rulesVersion: 'v3.0',
}

createRoot(document.getElementById('root')!).render(
  <div style={{ height: '100vh' }}>
    <DemoTable config={config} initialState={craftBlockScenario()} onExit={() => { /* harness */ }} />
  </div>,
)
