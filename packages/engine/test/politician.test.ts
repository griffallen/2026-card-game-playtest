import { describe, it, expect } from 'vitest'
import type { CardSet, GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'

// Decision 88 (#29 — Griff: "rather than a hard-coded rule, let's make it a keyword"):
// POLITICIAN — at round end, a seat with a Politician standing in Neutral AND more units
// there than the opponent gains 1 influence. Once per round, however many politicians.
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

describe('Politician (decision 88)', () => {
  it('a politician in Neutral with the majority sways the track — once, however many', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    put(s, me, 'senator', 1)
    put(s, me, 'senator', 1)                    // two politicians, still +1
    put(s, me, 'pawn', 1, { exhausted: true })  // exhausted bodies still count toward the majority
    put(s, them, 'pawn', 1)
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(1)
  })

  it('no majority → no sway; majority without a politician → nothing either', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    put(s, me, 'senator', 1)
    put(s, them, 'pawn', 1)                     // tied 1-1: no majority
    const b1 = s.influence
    const a1 = endRoundByPasses(s)
    expect(a1.influence).toBe(b1)

    const s2 = v3game()
    const me2 = s2.actorSeat
    put(s2, me2, 'pawn', 1)
    put(s2, me2, 'pawn', 1)                     // majority, but nobody to press it
    const b2 = inf(s2, me2)
    const a2 = endRoundByPasses(s2)
    expect(inf(a2, me2) - b2).toBe(0)
  })

  it('a politician at HOME earns nothing — the middle is where the argument is', () => {
    const s = v3game()
    const me = s.actorSeat
    put(s, me, 'senator', me === 0 ? 0 : 2)     // home zone, trivially the majority
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(0)
  })
})
