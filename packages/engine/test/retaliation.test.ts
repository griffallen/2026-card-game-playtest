import { describe, it, expect } from 'vitest'
import type { GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'

// #25 (Griff): "a unit directly attacked always deals combat damage to the attackers,
// whether it's exhausted or not." Experiment knob: rules.retaliation 'blockers' (current
// law — fighting back IS blocking) vs 'always' (the declared target strikes every
// unblocked attacker at full power, exhausted included). Off by default everywhere.
function game(retaliation: 'blockers' | 'always'): GameState {
  let s = createGame({
    seed: 31,
    rules: { ...V3_RULES, retaliation, chooseStartingResources: false },
    cardSet: T,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

/** Declare an attack and, if the block window opens, decline it. */
function swing(s: GameState, seat: 0 | 1, attackers: string[], target: string): GameState {
  s.actorSeat = seat
  let next = applyAction(s, { type: 'attack', attackers, target: { kind: 'unit', id: target } }, seat).state
  if (next.phase === 'block') next = applyAction(next, { type: 'block', pairs: [] }, (1 - seat) as 0 | 1).state
  return next
}

describe('retaliation experiment (#25)', () => {
  it("'blockers' (current law): an exhausted target takes the hit and no one strikes back", () => {
    const s = game('blockers')
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const raider = put(s, me, 'soldier', 1)          // 2/2
    const sleepy = put(s, them, 'brute', 1, { exhausted: true })   // 4/3, asleep
    const after = swing(s, me, [raider], sleepy)
    expect(after.units[sleepy].damage).toBe(2)       // full hit lands
    expect(after.units[raider].damage).toBe(0)       // no strike-back without blocking
  })

  it("'always': the exhausted target strikes EVERY unblocked attacker at full power", () => {
    const s = game('always')
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const r1 = put(s, me, 'soldier', 1)              // 2/2
    const r2 = put(s, me, 'soldier', 1)              // 2/2
    const sleepy = put(s, them, 'brute', 1, { exhausted: true })   // 4/3, asleep but angry
    const after = swing(s, me, [r1, r2], sleepy)
    expect(after.units[sleepy]).toBeUndefined()      // 2+2 ≥ 3 health: the brute falls
    expect(after.units[r1]).toBeUndefined()          // but its 4 power fells each 2-health attacker
    expect(after.units[r2]).toBeUndefined()
  })

  it("'always': blocked attackers take only their pair counter — no double dip", () => {
    const s = game('always')
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const raider = put(s, me, 'soldier', 1)          // 2/2
    const target = put(s, them, 'brute', 1, { exhausted: true })   // 4/3
    const wall = put(s, them, 'wall', 1)             // 0/5 cantAttack blocker
    s.actorSeat = me
    let next = applyAction(s, { type: 'attack', attackers: [raider], target: { kind: 'unit', id: target } }, me).state
    next = applyAction(next, { type: 'block', pairs: [{ blocker: wall, onto: raider }] }, them).state
    expect(next.units[raider].damage).toBe(0)        // wall counters 0; target never touched it
    expect(next.units[target].damage).toBe(0)        // fully blocked: nothing reached the target
    expect(next.units[wall].damage).toBe(2)
  })
})
