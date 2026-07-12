import { describe, it, expect } from 'vitest'
import type { GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'

// #29 door-1 experiment (Griff: "sim door 1"): at the end of each round, whoever holds more
// READY units in the Neutral zone than their opponent gains rules.neutralControlInfluence.
// Off (0) by default everywhere — this knob exists to be simmed and playtested, not assumed.
function game(neutralControlInfluence: number): GameState {
  let s = createGame({
    seed: 101,
    rules: { ...V3_RULES, neutralControlInfluence, chooseStartingResources: false },
    cardSet: T,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

const inf = (s: GameState, seat: 0 | 1) => (seat === 0 ? s.influence : -s.influence)

/** Both players pass — the round ends. */
function endRoundByPasses(s: GameState): GameState {
  let n = applyAction(s, { type: 'pass' }, s.actorSeat).state
  n = applyAction(n, { type: 'pass' }, n.actorSeat).state
  return n
}

describe('the middle pays its holder (#29 door 1)', () => {
  it('more READY units in Neutral at round end → +1 influence; exhausted bodies do not count', () => {
    const s = game(1)
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    put(s, me, 'soldier', 1)
    put(s, me, 'pawn', 1, { exhausted: true })     // spent: a bystander, not a holder
    put(s, them, 'pawn', 1, { exhausted: true })
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(1)        // 1 ready vs 0 ready
  })

  it('a tie (or an empty middle) pays nobody', () => {
    const s = game(1)
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    put(s, me, 'soldier', 1)
    put(s, them, 'soldier', 1)
    const b0 = s.influence
    const after = endRoundByPasses(s)
    expect(after.influence).toBe(b0)

    const s2 = game(1)
    const b2 = s2.influence
    const after2 = endRoundByPasses(s2)
    expect(after2.influence).toBe(b2)
  })

  it('the knob is off by default — no phantom income', () => {
    const s = game(0)
    const me = s.actorSeat
    put(s, me, 'soldier', 1)
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(0)
  })
})
