import { describe, it, expect } from 'vitest'
import type { CardSet, GameState } from '../src/types.ts'
import { homeZone } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'

// Politician (#104 rework — Griff): at round end, count P = your (non-imprisoned) politicians.
// Neutral majority → +1 × P; enemy-Home majority → +2 × P; both apply (up to +3 × P). "Majority" =
// strictly MORE of your units than the opponent's in that zone (a tie is not a majority).
// ⚑ LITERAL reading (built, pending Griff confirmation): P is your TOTAL politicians wherever they
// stand — the two zone-majority checks are global, not "the politician must stand in the zone."
const K: CardSet = {
  ...T,
  senator: { slug: 'senator', name: 'senator', color: 'purple', type: 'unit', cost: 2, power: 1, health: 3, text: '', kw: [{ k: 'politician' }] },
}

function v3game(): GameState {
  let s = createGame({
    seed: 111,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: K,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}
const inf = (s: GameState, seat: 0 | 1) => (seat === 0 ? s.influence : -s.influence)
function endRoundByPasses(s: GameState): GameState {
  let n = applyAction(s, { type: 'pass' }, s.actorSeat).state
  return applyAction(n, { type: 'pass' }, n.actorSeat).state
}

describe('Politician (#104 rework — per-politician, two zones)', () => {
  it('2 politicians + Neutral majority → +2 (scales per politician)', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    put(s, me, 'senator', 1)
    put(s, me, 'senator', 1)                    // 2 of my units in Neutral (both politicians)
    put(s, them, 'pawn', 1)                     // enemy has 1 there → I hold the majority
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(2)     // was +1 flat under decision 88; now +1 × 2 politicians
  })

  it('Neutral majority AND enemy-Home majority → +6 (2×1 + 2×2)', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    put(s, me, 'senator', 1)
    put(s, me, 'senator', 1)                    // P = 2, Neutral majority (2 vs 0)
    put(s, me, 'pawn', homeZone(them))          // 1 of my units in the enemy's Home (0 enemy there) → majority
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(6)     // Neutral 2×1 + enemy-Home 2×2 = 2 + 4
  })

  it('3 politicians, Neutral majority only → +3', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    put(s, me, 'senator', 1)
    put(s, me, 'senator', 1)
    put(s, me, 'senator', 1)                    // P = 3, all in Neutral
    put(s, them, 'pawn', 1)                     // enemy 1 there → still my majority
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(3)     // 3 politicians × +1 for the single Neutral majority
  })

  it('no majority anywhere → nothing', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    put(s, me, 'senator', 1)                    // 1 politician in Neutral…
    put(s, them, 'pawn', 1)
    put(s, them, 'pawn', 1)                     // …but the enemy holds Neutral 2 vs 1 — I have no majority
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(0)
  })

  it('a tie in a zone is not a majority — no gain there', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    put(s, me, 'senator', 1)
    put(s, them, 'pawn', 1)                     // Neutral tied 1-1 → not a majority
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(0)
  })

  it('majority without any politician earns nothing', () => {
    const s = v3game()
    const me = s.actorSeat
    put(s, me, 'pawn', 1)
    put(s, me, 'pawn', 1)                       // Neutral majority, but no politician to press it
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(0)
  })

  it('a politician in your OWN Home cashes nothing on its own — only Neutral and the enemy Home pay', () => {
    const s = v3game()
    const me = s.actorSeat
    put(s, me, 'senator', homeZone(me))         // trivially the majority at home, but home never pays
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(0)
  })

  it('⚑ LITERAL reading: a politician standing at home still cashes a Neutral majority won by other units', () => {
    // This is the flagged ambiguity. Under the built (literal) rule, P counts the home-bound senator
    // and the two pawns give the Neutral majority → +1 × 1. Under the alternative "the politician must
    // STAND in Neutral" reading this would be 0. If Griff wants the positional rule, flip this.
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    put(s, me, 'senator', homeZone(me))         // the only politician — NOT in Neutral
    put(s, me, 'pawn', 1)
    put(s, me, 'pawn', 1)                       // two non-politicians win the Neutral majority (2 vs 0)
    put(s, them, 'pawn', 1)                     // enemy 1 in Neutral → I still lead 2 vs 1
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(1)     // literal: P(=1) × +1 Neutral majority
  })
})
