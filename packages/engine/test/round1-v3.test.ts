import { describe, it, expect } from 'vitest'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { DEFAULT_RULES, V3_RULES } from '../src/rules.ts'
import { T, toyDeck } from './util.ts'

// Decision 71 (issue #20, Griff): under v3, round 1 has NO start step — no ready, no draw,
// no bank. You play round 1 from your opening hand with the 2 setup resources; the first
// draw-2-then-bank-1 happens at the top of round 2. Reverses decision 44 for v3 only.
describe('round 1 skips the start step (v3, decision 71)', () => {
  const mk = (rules: typeof DEFAULT_RULES) => createGame({
    seed: 5,
    rules: { ...rules, chooseStartingResources: false },
    cardSet: T,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })

  it('v3: round 1 opens straight into the action loop — no draw, no bank window', () => {
    const s = mk(V3_RULES)
    expect(s.round).toBe(1)
    expect(s.phase).toBe('loop')
    for (const seat of [0, 1] as const) {
      // opening 7 minus the 2 auto-banked at setup — and NOT +2 from a round-1 draw
      expect(s.sides[seat].hand.length).toBe(5)
      expect(s.sides[seat].resources.length).toBe(2)
    }
  })

  it('v3: the first start step arrives with round 2 — draw 2, then the bank window', () => {
    let s = mk(V3_RULES)
    s = applyAction(s, { type: 'pass' }, s.actorSeat).state
    s = applyAction(s, { type: 'pass' }, s.actorSeat).state   // two passes end round 1
    expect(s.round).toBe(2)
    expect(s.phase).toBe('bank')
    expect(s.sides[s.initiative].hand.length).toBe(7)         // 5 + the round-2 draw of 2
  })

  it('v2.3 control: round 1 keeps its legacy start step (decision 44 unchanged)', () => {
    const s = mk(DEFAULT_RULES)
    expect(s.round).toBe(1)
    expect(s.phase).toBe('bank')
    expect(s.sides[s.initiative].hand.length).toBe(7)         // 5 + firstRoundDraw 2
  })
})
