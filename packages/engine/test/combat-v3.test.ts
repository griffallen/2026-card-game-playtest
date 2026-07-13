import { describe, it, expect } from 'vitest'
import type { GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'

// Slice V3-4 — blocker-pairing combat (spec game-rules-v3-draft §1.3, decisions from #9 Q4-Q6 + 62).
function g(): GameState {
  let s = createGame({
    seed: 21,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: T,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

describe('blocker-pairing combat (v3)', () => {
  it('declare → block window → paired simultaneous damage; unblocked attackers hit the target', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const a1 = put(s, me, 'brute', 1)     // 4/3
    const a2 = put(s, me, 'soldier', 1)   // 2/2
    const victim = put(s, them, 'wall', 1)     // 0/5 declared target
    const blocker = put(s, them, 'brute', 1)   // 4/3 will block a1
    s = applyAction(s, { type: 'attack', attackers: [a1, a2], target: { kind: 'unit', id: victim } }, me).state
    expect(s.phase).toBe('block')
    expect(s.actorSeat).toBe(them)
    s = applyAction(s, { type: 'block', pairs: [{ blocker, onto: a1 }] }, them).state
    // a1 (4) vs blocker (4/3): blocker dies, a1 takes 4 and dies — simultaneous
    expect(s.units[a1]).toBeUndefined()
    expect(s.units[blocker]).toBeUndefined()
    // a2 was unblocked: full 2 damage to the declared wall; the wall never counter-hits
    expect(s.units[victim].damage).toBe(2)
    expect(s.units[a2].damage).toBe(0)
    expect(s.phase).toBe('loop')
  })

  it('gang block: defender pour order splits the attacker damage; combined counter kills', () => {
    // decision 98 (duel law): gang-blocking needs a gang — a pawn rides along so the pairing stays open
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const big = put(s, me, 'crusher', 1)      // 3/3 breakthrough (kw n ignored in v3 resolve)
    const chaff = put(s, me, 'pawn', 1)       // 1/1 second attacker — unblocked, hits the target
    const b1 = put(s, them, 'soldier', 1)     // 2/2 listed first: eats 2
    const b2 = put(s, them, 'brute', 1)       // 4/3 second: eats overflow 1
    s = applyAction(s, { type: 'attack', attackers: [big, chaff], target: { kind: 'unit', id: b2 } }, me).state
    s = applyAction(s, { type: 'block', pairs: [{ blocker: b1, onto: big }, { blocker: b2, onto: big }] }, them).state
    expect(s.units[b1]).toBeUndefined()       // 2 damage kills the 2/2
    expect(s.units[b2].damage).toBe(2)        // pour overflow 1 + the unblocked pawn's 1
    expect(s.units[big]).toBeUndefined()      // 2+4 combined counter kills the 3-health crusher
    expect(s.units[chaff]).toBeUndefined()    // decision 84: the target struck the unblocked pawn back at 4
  })

  it('breakthrough spills leftover damage to the ORIGINAL declared target', () => {
    // decision 98 (duel law): a plain chump may only block inside a gang — a runner rides along
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const big = put(s, me, 'crusher', 1)      // 3 power, breakthrough
    const mate = put(s, me, 'runner', 1)      // 1/1 second attacker — unblocked
    const chump = put(s, them, 'pawn', 1)     // 1/1 blocker
    const victim = put(s, them, 'wall', 1)    // 0/5 declared target
    s = applyAction(s, { type: 'attack', attackers: [big, mate], target: { kind: 'unit', id: victim } }, me).state
    s = applyAction(s, { type: 'block', pairs: [{ blocker: chump, onto: big }] }, them).state
    expect(s.units[chump]).toBeUndefined()
    expect(s.units[victim].damage).toBe(3)    // 2 spilled through the pawn + the runner's 1
  })

  it('blocking exhausts non-Guards; Guards block and stay ready (decision 62)', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const a1 = put(s, me, 'pawn', 1)
    const a2 = put(s, me, 'pawn', 1)
    const victim = put(s, them, 'wall', 1)
    const plain = put(s, them, 'brute', 1)
    const guard = put(s, them, 'guardian', 1)   // 1/3 guard
    s = applyAction(s, { type: 'attack', attackers: [a1, a2], target: { kind: 'unit', id: victim } }, me).state
    s = applyAction(s, { type: 'block', pairs: [{ blocker: plain, onto: a1 }, { blocker: guard, onto: a2 }] }, them).state
    expect(s.units[plain].exhausted).toBe(true)
    expect(s.units[guard].exhausted).toBe(false)
  })

  it('no ready defenders → no block window; v3 ranged attacks are ordinary (decision 80)', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const archer = put(s, me, 'archer', 1)          // ranged — but in v3 that's an ability, not reach
    const far = put(s, them, 'brute', 2)            // adjacent zone: out of attack range now
    expect(() => applyAction(s, { type: 'attack', attackers: [archer], target: { kind: 'unit', id: far } }, me))
      .toThrowError(/zone/i)                        // decision 80: the sniper shot left with v2.3
    const near = put(s, them, 'brute', 1, { exhausted: true })   // same zone, cannot block
    s.actorSeat = me
    s = applyAction(s, { type: 'attack', attackers: [archer], target: { kind: 'unit', id: near } }, me).state
    expect(s.phase).toBe('loop')                    // no ready defenders → resolved immediately
    expect(s.units[near].damage).toBe(2)
    expect(s.units[archer]).toBeUndefined()         // decision 84: the attacked always fight back — 4 power fells the 2/2
  })
})

describe('pair isolation and counter attribution (issue #58, Griff)', () => {
  // Griff's report: two attackers on his Home, two 1v1 blocks — the recap's twin
  // "takes N damage from the blockers" lines read as one combined pool hitting both
  // attackers. The damage was per-pair all along; the LOG must say who hit whom.
  it('1v1 pairs on a base attack resolve in isolation, and counters name the blocker', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const enemyHome = (me === 0 ? 2 : 0) as 0 | 2
    const a1 = put(s, me, 'pawn', enemyHome)        // 1/1
    const a2 = put(s, me, 'brute', enemyHome)       // 4/3
    const b1 = put(s, them, 'soldier', enemyHome)   // 2/2 blocks a1
    const b2 = put(s, them, 'soldier', enemyHome)   // 2/2 blocks a2
    const lifeBefore = s.sides[them].life
    s = applyAction(s, { type: 'attack', attackers: [a1, a2], target: { kind: 'base', seat: them } }, me).state
    s = applyAction(s, { type: 'block', pairs: [{ blocker: b1, onto: a1 }, { blocker: b2, onto: a2 }] }, them).state
    // per-pair isolation: each attacker eats ONLY its own blocker's counter
    expect(s.units[a1]).toBeUndefined()             // the pawn died to its soldier's 2
    expect(s.units[a2].damage).toBe(2)              // the brute took ITS soldier's 2 and lives — a
                                                    // combined 2+2 pool (Griff's read) would kill it
    expect(s.sides[them].life).toBe(lifeBefore)     // both attackers blocked — the base untouched
    // attribution: the counter lines name the blocker, not "the blockers"
    const msgs = s.log.map(l => l.msg)
    expect(msgs.some(m => /pawn takes 2 damage from soldier/.test(m))).toBe(true)
    expect(msgs.some(m => /the blockers/.test(m))).toBe(false)
  })
})
