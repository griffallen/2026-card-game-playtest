import { describe, it, expect } from 'vitest'
import type { CardSet, GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'

// Rules-court pins (#24, 2026-07-12): decisions 76 and 77 RATIFY existing engine behavior —
// these tests exist so the ratified law can never drift silently.
const K: CardSet = {
  ...T,
  ghost: { slug: 'ghost', name: 'ghost', color: 'purple', type: 'unit', cost: 2, power: 3, health: 3, text: '', kw: [{ k: 'hidden' }] },
  shell: { slug: 'shell', name: 'shell', color: 'yellow', type: 'unit', cost: 2, power: 1, health: 3, text: '', kw: [{ k: 'shielded' }, { k: 'guard' }] },   // guard: duels admit only guards (decision 98)
  splasher: { slug: 'splasher', name: 'splasher', color: 'red', type: 'unit', cost: 3, power: 3, health: 3, text: '',
    kw: [{ k: 'ranged' }], onAttack: [{ op: 'damage', t: 'autoSplash', n: 1 }] },
}

function v3game(): GameState {
  let s = createGame({
    seed: 61,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: K,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

describe('decision 76 — Hidden beats choices, not consequences', () => {
  it('an automatic pick ("strongest other") still finds a ready Hidden unit', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const sniper = put(s, me, 'splasher', 1)
    const bait = put(s, them, 'pawn', 1, { exhausted: true })   // 1/1, the declared target
    const ghost = put(s, them, 'ghost', 1)                      // ready + Hidden: strongest other in the zone
    s.actorSeat = me
    let next = applyAction(s, { type: 'attack', attackers: [sniper], target: { kind: 'unit', id: bait } }, me).state
    if (next.phase === 'block') next = applyAction(next, { type: 'block', pairs: [] }, them).state
    expect(next.units[ghost].damage).toBe(1)   // not chosen — consequence: the splash lands
  })
})

describe('decision 77 — a shield wall soaks the whole pour', () => {
  it('a Shielded blocker absorbs the attack entirely and shrinks Breakthrough spill', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const crusher = put(s, me, 'crusher', 1)                    // 3 power, breakthrough
    const target = put(s, them, 'pawn', 1, { exhausted: true }) // 1/1
    const shell = put(s, them, 'shell', 1)                      // shielded 1/3 blocker
    s.actorSeat = me
    let next = applyAction(s, { type: 'attack', attackers: [crusher], target: { kind: 'unit', id: target } }, me).state
    next = applyAction(next, { type: 'block', pairs: [{ blocker: shell, onto: crusher }] }, them).state
    expect(next.units[shell].damage).toBe(0)     // the token ate the whole hit
    expect(next.units[shell].shielded).toBe(false)
    expect(next.units[target].damage).toBe(0)    // and no spill got through — 3 power poured into the wall
  })
})
