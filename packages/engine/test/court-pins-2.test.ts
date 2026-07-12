import { describe, it, expect } from 'vitest'
import type { CardSet, GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'

// Second court session (#25, 2026-07-12): decision 86 — being targeted IS defending, so a
// self-blocking target fires onDefend ONCE; decision 87 — "attacks a base" counts the
// declaration, so it fires even when every point of damage is prevented.
const K: CardSet = {
  ...T,
  paladin: { slug: 'paladin', name: 'paladin', color: 'yellow', type: 'unit', cost: 3, power: 2, health: 5, text: '',
    kw: [{ k: 'guard' }], onDefend: [{ op: 'influence', n: 2 }] },
  siegecat: { slug: 'siegecat', name: 'siegecat', color: 'red', type: 'unit', cost: 3, power: 2, health: 3, text: '',
    onAttackBase: [{ op: 'influence', n: 1 }] },
  aegis: { slug: 'aegis', name: 'aegis', color: 'yellow', type: 'action', cost: 1, text: '',
    onPlay: [{ op: 'preventBase', n: 10 }] },
}

function v3game(): GameState {
  let s = createGame({
    seed: 81,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: K,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}
let m = 9900
function give(s: GameState, seat: 0 | 1, slug: string): string {
  const id = `p${m++}`
  s.cardOf[id] = slug; s.sides[seat].hand.push(id)
  for (let i = 0; i < 4; i++) { const r = `p${m++}`; s.cardOf[r] = 'pawn'; s.sides[seat].resources.push({ id: r, exhausted: false }) }
  return id
}
const inf = (s: GameState, seat: 0 | 1) => (seat === 0 ? s.influence : -s.influence)

describe('decision 86 — targeted IS defending: one trigger, even when self-blocking', () => {
  it('a self-blocking target collects its onDefend exactly once', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const raider = put(s, me, 'soldier', 1)          // 2/2
    const paladin = put(s, them, 'paladin', 1)       // 2/5 guard, onDefend +2
    s.actorSeat = me
    const before = inf(s, them)
    let next = applyAction(s, { type: 'attack', attackers: [raider], target: { kind: 'unit', id: paladin } }, me).state
    next = applyAction(next, { type: 'block', pairs: [{ blocker: paladin, onto: raider }] }, them).state
    expect(inf(next, them) - before).toBe(2)         // once, not twice
  })

  it('a target defended by OTHERS still collects its own trigger once', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const raider = put(s, me, 'soldier', 1)
    const target = put(s, them, 'paladin', 1)        // targeted, doesn't block
    const wall = put(s, them, 'wall', 1)
    s.actorSeat = me
    const before = inf(s, them)
    let next = applyAction(s, { type: 'attack', attackers: [raider], target: { kind: 'unit', id: target } }, me).state
    next = applyAction(next, { type: 'block', pairs: [{ blocker: wall, onto: raider }] }, them).state
    expect(inf(next, them) - before).toBe(2)         // targeted = defending, blocked or not
  })
})

describe('decision 87 — the declaration counts: onAttackBase fires on zero damage', () => {
  it('a fully-prevented base assault still fires "attacks a base"', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    // the defender shields their base completely
    s.actorSeat = them
    const shield = give(s, them, 'aegis')
    s = applyAction(s, { type: 'play', card: shield }, them).state
    s.actorSeat = me
    const cat = put(s, me, 'siegecat', them === 0 ? 0 : 2)   // standing in the enemy home
    const before = inf(s, me)
    const lifeBefore = s.sides[them].life
    let next = applyAction(s, { type: 'attack', attackers: [cat], target: { kind: 'base', seat: them } }, me).state
    if (next.phase === 'block') next = applyAction(next, { type: 'block', pairs: [] }, them).state
    expect(next.sides[them].life).toBe(lifeBefore)   // every point prevented
    expect(inf(next, me) - before).toBe(1)           // but the attack was declared and landed unblocked
  })
})
