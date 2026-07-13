import { describe, it, expect } from 'vitest'
import type { GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'

// Issue #50 (experiment, behind singleAttackerDuels): a lone attacker cannot be blocked
// except by ONE Guard (full redirect, no exhaust). Gangs keep today's open pairing.
function g(): GameState {
  let s = createGame({
    seed: 50,
    rules: { ...V3_RULES, singleAttackerDuels: true, chooseStartingResources: false },
    cardSet: T,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

describe('duel law (issue #50, singleAttackerDuels)', () => {
  it('a lone attacker skips the block window entirely when no Guard stands ready', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const atk = put(s, me, 'brute', 1)                 // 4/3
    const victim = put(s, them, 'soldier', 1)          // 2/2 — ready, would love to be saved
    put(s, them, 'crusher', 1)                          // ready non-guard bystander: no window
    s = applyAction(s, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: victim } }, me).state
    expect(s.phase).toBe('loop')                        // resolved immediately — no block window
    expect(s.units[victim]).toBeUndefined()             // 4 damage kills the 2/2
    expect(s.units[atk].damage).toBe(2)                 // decision 84: the target still hit back
  })

  it('one Guard may step in front — full redirect, no exhaust; only ONE may', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const atk = put(s, me, 'brute', 1)                 // 4/3
    const victim = put(s, them, 'soldier', 1)
    const guard = put(s, them, 'guardian', 1)          // 1/3 guard
    const guard2 = put(s, them, 'guardian', 1)
    s = applyAction(s, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: victim } }, me).state
    expect(s.phase).toBe('block')
    const blocks = getLegalActions(s, them).filter(a => a.type === 'block' && a.pairs.length)
    // both guards offer, but every offer is a single pair — no gangs, no plain units
    expect(blocks.every(b => b.pairs.length === 1)).toBe(true)
    expect(new Set(blocks.map(b => b.pairs[0].blocker))).toEqual(new Set([guard, guard2]))
    expect(() => applyAction(s, { type: 'block', pairs: [{ blocker: guard, onto: atk }, { blocker: guard2, onto: atk }] }, them))
      .toThrow(/one guard at most/)
    s = applyAction(s, { type: 'block', pairs: [{ blocker: guard, onto: atk }] }, them).state
    expect(s.units[victim].damage).toBe(0)              // full redirect — the target is untouched
    expect(s.units[guard]).toBeUndefined()               // the guard ate all 4
    expect(s.units[guard2].exhausted).toBe(false)
  })

  it('a plain unit may not step into a duel', () => {
    const s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const atk = put(s, me, 'brute', 1)
    const victim = put(s, them, 'soldier', 1)
    put(s, them, 'guardian', 1)                          // a guard opens the window…
    const plain = put(s, them, 'crusher', 1)
    const s2 = applyAction(s, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: victim } }, me).state
    expect(() => applyAction(s2, { type: 'block', pairs: [{ blocker: plain, onto: atk }] }, them))
      .toThrow(/only a Guard/i)
  })

  it('gangs keep the open pairing rules — any ready unit may block any attacker', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const a1 = put(s, me, 'brute', 1)
    const a2 = put(s, me, 'soldier', 1)
    const victim = put(s, them, 'wall', 1)
    const plain = put(s, them, 'crusher', 1)             // NOT a guard — still blocks in a gang
    s = applyAction(s, { type: 'attack', attackers: [a1, a2], target: { kind: 'unit', id: victim } }, me).state
    expect(s.phase).toBe('block')
    s = applyAction(s, { type: 'block', pairs: [{ blocker: plain, onto: a1 }] }, them).state
    expect(s.units[victim].damage).toBe(2)               // only the unblocked soldier got through
  })
})
