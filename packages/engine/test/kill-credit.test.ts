import { describe, it, expect } from 'vitest'
import type { CardSet, GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'

// Decision 74 (#24 court, Q2 — Griff: "A kill is a kill. Any unit, designated target or
// defender."): onKill credits every combat kill to its killer — attackers felling their
// blockers, blockers felling their attacker — and idle fully-blocked attackers stop
// collecting on kills their allies landed.
const K: CardSet = {
  ...T,
  reaper: { slug: 'reaper', name: 'reaper', color: 'red', type: 'unit', cost: 3, power: 5, health: 4, text: '',
    onKill: [{ op: 'influence', n: 1 }] },
  cutpurse: { slug: 'cutpurse', name: 'cutpurse', color: 'red', type: 'unit', cost: 2, power: 2, health: 3, text: '',
    kw: [{ k: 'guard' }], onKill: [{ op: 'influence', n: 1 }] },   // guard: only guards may answer a duel (decision 98)
}

function v3game(): GameState {
  let s = createGame({
    seed: 51,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: K,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

const inf = (s: GameState, seat: 0 | 1) => (seat === 0 ? s.influence : -s.influence)

describe('a kill is a kill (decision 74)', () => {
  it('an attacker that fells its blocker collects its onKill', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const reaper = put(s, me, 'reaper', 1)              // 5/4, onKill +1
    const target = put(s, them, 'brute', 1, { exhausted: true })
    const blocker = put(s, them, 'cutpurse', 1)         // 2/3 guard chump (decision 98: duels admit only guards)
    s.actorSeat = me
    const before = inf(s, me)
    let next = applyAction(s, { type: 'attack', attackers: [reaper], target: { kind: 'unit', id: target } }, me).state
    next = applyAction(next, { type: 'block', pairs: [{ blocker, onto: reaper }] }, them).state
    expect(next.units[blocker]).toBeUndefined()          // chump died
    expect(inf(next, me) - before).toBe(1)               // the kill paid
  })

  it('blockers that fell their attacker collect too', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const raider = put(s, me, 'runner', 1)               // 1/1
    const target = put(s, them, 'brute', 1, { exhausted: true })
    const guardian = put(s, them, 'cutpurse', 1)         // 2/3, onKill +1
    s.actorSeat = me
    const before = inf(s, them)
    let next = applyAction(s, { type: 'attack', attackers: [raider], target: { kind: 'unit', id: target } }, me).state
    next = applyAction(next, { type: 'block', pairs: [{ blocker: guardian, onto: raider }] }, them).state
    expect(next.units[raider]).toBeUndefined()           // the counter killed it
    expect(inf(next, them) - before).toBe(1)             // the defender's kill paid
  })

  it('an idle, fully-blocked attacker gets NO credit for an ally-landed kill', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const idle = put(s, me, 'cutpurse', 1)               // 2/3 onKill +1 — walled off, kills nothing
    const finisher = put(s, me, 'soldier', 1)            // 2/2, no onKill — lands the kill
    const target = put(s, them, 'runner', 1, { exhausted: true })   // 1/1
    const wall = put(s, them, 'wall', 1)                 // 0/5, eats the cutpurse's 2
    s.actorSeat = me
    const before = inf(s, me)
    let next = applyAction(s, { type: 'attack', attackers: [idle, finisher], target: { kind: 'unit', id: target } }, me).state
    next = applyAction(next, { type: 'block', pairs: [{ blocker: wall, onto: idle }] }, them).state
    expect(next.units[target]).toBeUndefined()           // finisher killed it
    expect(next.units[wall].damage).toBe(2)              // wall stands — the cutpurse felled nothing
    expect(inf(next, me) - before).toBe(0)               // no kill, no pay
  })
})
