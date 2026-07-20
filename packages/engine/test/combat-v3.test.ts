import { describe, it, expect } from 'vitest'
import type { GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'

// Slice V3-4 — blocker-pairing combat (docs/rules.md §Combat, decisions from #9 Q4-Q6 + 62).
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

describe('siege breakthrough (decision 102, issue #66; amended by #128)', () => {
  // Griff: "no damage should be left behind from a Breakthrough attacker in an opponent's Home" —
  // excess pours through blockers, then the declared target, then into the base. #128 turns that
  // final base-pour into the DEFENDER's choice (base is one legal chain target in the Home).
  it('in the enemy Home, breakthrough excess past the unit target chains to the base (defender picks)', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const enemyHome = (me === 0 ? 2 : 0) as 0 | 2
    const big = put(s, me, 'crusher', enemyHome)     // 3/3 breakthrough
    const chaff = put(s, me, 'pawn', enemyHome)      // 1/1 rides along — opens the pairing
    const blocker = put(s, them, 'pawn', enemyHome)  // 1/1 blocks the crusher
    const victim = put(s, them, 'pawn', enemyHome)   // 1/1 declared target
    const lifeBefore = s.sides[them].life
    s = applyAction(s, { type: 'attack', attackers: [big, chaff], target: { kind: 'unit', id: victim } }, me).state
    s = applyAction(s, { type: 'block', pairs: [{ blocker, onto: big }] }, them).state
    // crusher 3 → blocker absorbs 1, spill 2; chaff's 1 (no breakthrough) fills the target first;
    // the target and its blocker both fall, so the base is the only legal chain target — the
    // defender must place the 2 there (the choice is forced, but it's still the defender's window)
    expect(s.units[victim]).toBeUndefined()
    expect(s.phase).toBe('splash')                   // #128: the pour into the base is now a defender pick
    s = applyAction(s, { type: 'splash', target: { kind: 'base', seat: them } }, them).state
    expect(s.sides[them].life).toBe(lifeBefore - 2)
  })
  it('outside the enemy Home, excess still stops at the declared target', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const big = put(s, me, 'crusher', 1)
    const chaff = put(s, me, 'pawn', 1)
    const blocker = put(s, them, 'pawn', 1)
    const victim = put(s, them, 'pawn', 1)
    const lifeBefore = s.sides[them].life
    s = applyAction(s, { type: 'attack', attackers: [big, chaff], target: { kind: 'unit', id: victim } }, me).state
    s = applyAction(s, { type: 'block', pairs: [{ blocker, onto: big }] }, them).state
    expect(s.units[victim]).toBeUndefined()
    expect(s.sides[them].life).toBe(lifeBefore)      // Neutral: nothing reaches the base
  })
})

// #118 (Griff): Breakthrough was leaking past a SHIELDED blocker into the base. Per docs/rules.md
// §Breakthrough — leftover spills only "when this attacker KILLS its blocker" — and §Shielded —
// "the first hit it would take is prevented in full ... a hit of any size." A shielded blocker
// survives, so it kills nothing and NOTHING breaks through. Fable's ruling (this describe is the
// spec): a shielded (or warded) blocker soaks the ENTIRE remaining pour aimed through it — token
// spends only when damage actually reaches it. Piercing attackers (#107) ignore shields, unchanged.
describe('#118 shield/ward stops breakthrough spill', () => {
  const enemyHomeOf = (me: 0 | 1) => (me === 0 ? 2 : 0) as 0 | 2

  it('(i) lone base-siege: a shielded blocker soaks a breakthrough swing — base takes 0, blocker lives, token spent', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const home = enemyHomeOf(me)
    const big = put(s, me, 'crusher', home)          // 3 power, breakthrough, standing in enemy Home
    const shield = put(s, them, 'pawn', home); s.units[shield].shielded = true  // 1/1 + shield token
    const lifeBefore = s.sides[them].life
    s = applyAction(s, { type: 'attack', attackers: [big], target: { kind: 'base', seat: them } }, me).state
    s = applyAction(s, { type: 'block', pairs: [{ blocker: shield, onto: big }] }, them).state
    expect(s.sides[them].life).toBe(lifeBefore)       // no kill → no spill
    expect(s.units[shield]).toBeDefined()             // shield survives
    expect(s.units[shield].shielded).toBe(false)      // token spent on the hit it stopped
    expect(s.units[shield].damage).toBe(0)            // and took none
  })

  it('(ii) gang, shielded FIRST: eats the whole pour — co-blocker untouched, nothing spills', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const big = put(s, me, 'crusher', 1)             // 3 power, breakthrough
    const mate = put(s, me, 'runner', 1)             // 1/1 unblocked rider → declared target only
    const shield = put(s, them, 'pawn', 1); s.units[shield].shielded = true
    const co = put(s, them, 'pawn', 1)               // second blocker in the pour
    const victim = put(s, them, 'wall', 1)           // 0/5 declared target (no counter)
    s = applyAction(s, { type: 'attack', attackers: [big, mate], target: { kind: 'unit', id: victim } }, me).state
    s = applyAction(s, { type: 'block', pairs: [{ blocker: shield, onto: big }, { blocker: co, onto: big }] }, them).state
    expect(s.units[shield].shielded).toBe(false)      // shield ate the whole 3
    expect(s.units[shield].damage).toBe(0)
    expect(s.units[co]).toBeDefined()                 // co-blocker never got hit
    expect(s.units[co].damage).toBe(0)
    expect(s.units[victim].damage).toBe(1)            // only the unblocked runner's 1 — 0 breakthrough spill
  })

  it('(iii) gang, shielded SECOND: first blocker resolves, shield eats the remainder, nothing spills', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const big = put(s, me, 'crusher', 1)             // 3 power, breakthrough
    const mate = put(s, me, 'runner', 1)             // 1/1 unblocked rider
    const first = put(s, them, 'pawn', 1)            // 1/1, listed first: dies
    const shield = put(s, them, 'pawn', 1); s.units[shield].shielded = true  // listed second
    const victim = put(s, them, 'wall', 1)
    s = applyAction(s, { type: 'attack', attackers: [big, mate], target: { kind: 'unit', id: victim } }, me).state
    s = applyAction(s, { type: 'block', pairs: [{ blocker: first, onto: big }, { blocker: shield, onto: big }] }, them).state
    expect(s.units[first]).toBeUndefined()            // 1 damage fells the 1/1
    expect(s.units[shield].shielded).toBe(false)      // shield absorbed the remaining 2
    expect(s.units[shield].damage).toBe(0)
    expect(s.units[victim].damage).toBe(1)            // only the runner — no breakthrough spill
  })

  it('(iv) pool exhausted before the shielded blocker is reached: its token is NOT spent', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const big = put(s, me, 'crusher', 1)             // 3 power
    const mate = put(s, me, 'runner', 1)
    const soak = put(s, them, 'brute', 1)            // 4/3 first: eats all 3, pool hits 0
    const shield = put(s, them, 'pawn', 1); s.units[shield].shielded = true  // second: never reached
    const victim = put(s, them, 'wall', 1)
    s = applyAction(s, { type: 'attack', attackers: [big, mate], target: { kind: 'unit', id: victim } }, me).state
    s = applyAction(s, { type: 'block', pairs: [{ blocker: soak, onto: big }, { blocker: shield, onto: big }] }, them).state
    expect(s.units[shield].shielded).toBe(true)       // untouched hit never came — token intact
    expect(s.units[shield].damage).toBe(0)
    expect(s.units[victim].damage).toBe(1)            // just the runner
  })

  it('(v) piercing attacker vs a shielded blocker is UNCHANGED: shield ignored, breakthrough still spills', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const home = enemyHomeOf(me)
    s.cardSet.piercer = { ...s.cardSet.crusher, slug: 'piercer', name: 'piercer', piercesArmorShield: true }
    const big = put(s, me, 'piercer', home)          // 3 power, breakthrough + pierce
    const shield = put(s, them, 'pawn', home); s.units[shield].shielded = true
    const lifeBefore = s.sides[them].life
    s = applyAction(s, { type: 'attack', attackers: [big], target: { kind: 'base', seat: them } }, me).state
    s = applyAction(s, { type: 'block', pairs: [{ blocker: shield, onto: big }] }, them).state
    expect(s.units[shield]).toBeUndefined()           // pierce fells it through the shield
    expect(s.sides[them].life).toBe(lifeBefore - 2)   // 3 − 1 raw health spills to the base
  })

  it('(vi) ward mirrors shield — base-siege: a warded blocker soaks the swing, base takes 0', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const home = enemyHomeOf(me)
    const big = put(s, me, 'crusher', home)
    const ward = put(s, them, 'pawn', home); s.units[ward].blockWard = true
    const lifeBefore = s.sides[them].life
    s = applyAction(s, { type: 'attack', attackers: [big], target: { kind: 'base', seat: them } }, me).state
    s = applyAction(s, { type: 'block', pairs: [{ blocker: ward, onto: big }] }, them).state
    expect(s.sides[them].life).toBe(lifeBefore)        // no spill past the ward
    expect(s.units[ward]).toBeDefined()
    expect(s.units[ward].damage).toBe(0)               // ward took none
    expect(s.units[ward].blockWard).toBeFalsy()        // token cleared
  })

  it('(vi-gang) ward, first in a gang, eats the whole pour — co-blocker untouched, nothing spills', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const big = put(s, me, 'crusher', 1)
    const mate = put(s, me, 'runner', 1)
    const ward = put(s, them, 'pawn', 1); s.units[ward].blockWard = true
    const co = put(s, them, 'pawn', 1)
    const victim = put(s, them, 'wall', 1)
    s = applyAction(s, { type: 'attack', attackers: [big, mate], target: { kind: 'unit', id: victim } }, me).state
    s = applyAction(s, { type: 'block', pairs: [{ blocker: ward, onto: big }, { blocker: co, onto: big }] }, them).state
    expect(s.units[ward].blockWard).toBeFalsy()
    expect(s.units[ward].damage).toBe(0)
    expect(s.units[co]).toBeDefined()
    expect(s.units[co].damage).toBe(0)
    expect(s.units[victim].damage).toBe(1)             // only the runner — no spill
  })
})
