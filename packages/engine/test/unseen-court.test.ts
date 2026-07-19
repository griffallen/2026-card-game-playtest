import { describe, expect, it } from 'vitest'
import type { CardSet, GameState, Seat } from '../src/types.ts'
import { homeZone } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { influenceFor } from '../src/helpers.ts'
import { T, toyDeck, put } from './util.ts'

// ── #122 exhausted-count PerCount primitives (exhaustedEnemyUnits / allExhaustedUnits) ──
// These two live, GLOBAL count-scalers were built for an interim #122 Sneak on The Unseen Court.
// The Court's LATER #122 rework (design consultant, engine-verified) replaced that Sneak with a
// count-based BODY (its Power = unit cards in both discards — see dynamic-stats.test.ts), so no
// shipped card uses these PerCounts today. They remain engine primitives; this file keeps them
// covered via a toy card. Semantics under test:
//   1. influence n:1 per exhaustedEnemyUnits — the controller gains 1 per Exhausted ENEMY unit.
//   2. damage enemyBase n:1 per allExhaustedUnits — the opponent's base bleeds 1 per Exhausted
//      unit on EITHER side, EXCEPT the firing source (Sneak exhausts it before the ops run), so an
//      empty board is a clean no-op, not self-inflicted bleed.

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

const TT: CardSet = {
  ...T,
  // toy Unseen Court — no pips (tests skip the pip gate; activate never charges cost anyway)
  court: {
    slug: 'court', name: 'court', color: 'purple', type: 'unit', cost: 8, power: 0, health: 8, text: '',
    kw: [{ k: 'hidden' }, { k: 'sneak' }],
    sneak: { ops: [
      { op: 'influence', n: 1, per: { count: 'exhaustedEnemyUnits' } },
      { op: 'damage', t: 'enemyBase', n: 1, per: { count: 'allExhaustedUnits' } },
    ] },
  },
}

function v3game(seed = 21): GameState {
  let s = createGame({
    seed, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet: TT,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

describe('#122 exhausted-count PerCounts (exhaustedEnemyUnits / allExhaustedUnits) — retained engine primitives', () => {
  it('gains Influence per Exhausted ENEMY unit; opponent bleeds Life per ALL Exhausted units (both sides)', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const court = put(s, me, 'court', homeZone(me))            // READY — fires the Sneak
    put(s, them, 'brute', 1, { exhausted: true })              // Exhausted enemy #1
    put(s, them, 'soldier', 1, { exhausted: true })            // Exhausted enemy #2
    put(s, me, 'pawn', 1, { exhausted: true })                 // Exhausted friendly
    put(s, them, 'pawn', 2)                                    // READY enemy — not counted
    put(s, me, 'soldier', 2)                                   // READY friendly — not counted
    const inf0 = influenceFor(s, me)
    const life0 = s.sides[them].life
    s = act(s, me, { type: 'activate', unit: court })
    expect(influenceFor(s, me)).toBe(inf0 + 2)                 // 2 Exhausted enemies
    expect(s.sides[them].life).toBe(life0 - 3)                 // 3 Exhausted bodies (2 enemy + 1 friendly); the court excluded
    expect(s.units[court].exhausted).toBe(true)                // it tapped to Sneak
  })

  it('counts only ENEMY exhausted for Influence but BOTH sides for the Life bleed', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const court = put(s, me, 'court', homeZone(me))
    put(s, me, 'brute', 1, { exhausted: true })                // exhausted FRIENDLY only
    put(s, me, 'soldier', 1, { exhausted: true })              // exhausted FRIENDLY only
    const inf0 = influenceFor(s, me)
    const life0 = s.sides[them].life
    s = act(s, me, { type: 'activate', unit: court })
    expect(influenceFor(s, me)).toBe(inf0)                     // no exhausted ENEMY → no Influence
    expect(s.sides[them].life).toBe(life0 - 2)                 // 2 exhausted friendly bodies still bleed the enemy base
  })

  it('zero exhausted units → clean no-op: no Influence, no Life lost (the court does not bleed off its own tap)', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const court = put(s, me, 'court', homeZone(me))
    put(s, them, 'brute', 1)                                   // READY enemy
    put(s, me, 'soldier', 1)                                   // READY friendly
    const inf0 = influenceFor(s, me)
    const life0 = s.sides[them].life
    s = act(s, me, { type: 'activate', unit: court })
    expect(influenceFor(s, me)).toBe(inf0)                     // per-count 0 → no gain
    expect(s.sides[them].life).toBe(life0)                     // per-count 0 → no bleed (court excluded)
    expect(s.units[court].exhausted).toBe(true)
  })
})
