import { describe, it, expect } from 'vitest'
import type { CardSet, GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put, toHand } from './util.ts'

// PRs #38/#39 — the two ops their new text demanded.
// Unchained Rage: `attackTax` — every attack declaration cedes n influence per attacker, rounds rounds.
// Final Onslaught: `doom` — after the extra action, the readied unit dies, and so does
// every unit its attack actually wounded.
const SET: CardSet = {
  ...T,
  mastiff: { slug: 'mastiff', name: 'mastiff', color: 'red', type: 'unit', cost: 3, power: 4, health: 3, text: '',
    kw: [{ k: 'guard' }] },   // decision 98: duels admit only guards — the doom tests' blocker
  rage: { slug: 'rage', name: 'rage', color: 'red', type: 'action', cost: 0, text: '',
    onPlay: [{ op: 'double', t: { side: 'friendly' }, rounds: 2 }, { op: 'attackTax', n: 2, rounds: 2 }] },
  finale: { slug: 'finale', name: 'finale', color: 'red', type: 'action', cost: 0, text: '',
    targets: [{ t: 'unit', side: 'friendly' }],
    onPlay: [{ op: 'ready', side: 'friendly', t: 'chosen0' }, { op: 'extraAction' }, { op: 'doom', t: 'chosen0' }] },
}

function g(): GameState {
  let s = createGame({
    seed: 38,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: SET,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

/** Both seats pass, then drive the next round's bank steps to the loop. */
function nextRound(s: GameState): GameState {
  s = applyAction(s, { type: 'pass' }, s.actorSeat).state
  s = applyAction(s, { type: 'pass' }, s.actorSeat).state
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

describe('attackTax (Unchained Rage, PR #39)', () => {
  it('charges n influence per attacker at declaration, and only taxes its own seat', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const a1 = put(s, me, 'brute', 1)
    const a2 = put(s, me, 'soldier', 1)
    const wall = put(s, them, 'wall', 1, { exhausted: true })   // nothing ready — no block window
    const rage = toHand(s, me, 'rage')
    s = applyAction(s, { type: 'play', card: rage }, me).state
    expect(s.attackTaxes).toEqual([{ seat: me, n: 2, rounds: 2 }])
    s = applyAction(s, { type: 'pass' }, them).state   // window came back around
    const before = s.influence
    s = applyAction(s, { type: 'attack', attackers: [a1, a2], target: { kind: 'unit', id: wall } }, me).state
    // one shared track: seat 0 losing pushes it negative, seat 1 losing pushes it positive
    expect(s.influence).toBe(me === 0 ? before - 4 : before + 4)
  })

  it('expires after its rounds tick down at round end', () => {
    let s = g()
    const me = s.actorSeat
    const rage = toHand(s, me, 'rage')
    s = applyAction(s, { type: 'play', card: rage }, me).state
    expect(s.attackTaxes[0].rounds).toBe(2)
    s = nextRound(s)
    expect(s.attackTaxes[0].rounds).toBe(1)
    s = nextRound(s)
    expect(s.attackTaxes).toEqual([])
  })
})

describe('doom (Final Onslaught, PR #38)', () => {
  it('kills the readied unit after a non-attack extra action, with no victims', () => {
    let s = g()
    const me = s.actorSeat
    const vet = put(s, me, 'brute', 1, { exhausted: true })
    const finale = toHand(s, me, 'finale')
    s = applyAction(s, { type: 'play', card: finale, targets: [{ kind: 'unit', id: vet }] }, me).state
    expect(s.units[vet].exhausted).toBe(false)     // readied
    expect(s.doom).toEqual({ unit: vet, seat: me, stage: 'waiting' })
    expect(s.actorSeat).toBe(me)                   // extra action window
    s = applyAction(s, { type: 'move', unit: vet, to: 0 }, me).state
    expect(s.units[vet]).toBeUndefined()           // the onslaught ends
    expect(s.doom).toBeNull()
  })

  it('after an unblocked attack, the doomed unit AND the unit it wounded both die', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const vet = put(s, me, 'brute', 1, { exhausted: true })      // 4 power
    const wall = put(s, them, 'wall', 1, { exhausted: true })    // 0/5 — survives 4, then dooms
    const finale = toHand(s, me, 'finale')
    s = applyAction(s, { type: 'play', card: finale, targets: [{ kind: 'unit', id: vet }] }, me).state
    s = applyAction(s, { type: 'attack', attackers: [vet], target: { kind: 'unit', id: wall } }, me).state
    // no ready defender → resolves inside the declaration; the extra action IS the attack
    expect(s.units[vet]).toBeUndefined()
    expect(s.units[wall]).toBeUndefined()
    expect(s.doom).toBeNull()
    expect(s.doomVictims).toEqual([])
  })

  it('through a block window: wounded blocker dies with it; an untouched bystander does not', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const vet = put(s, me, 'brute', 1, { exhausted: true })      // 4/3
    const wall = put(s, them, 'wall', 1)                          // 0/5 target — blocks a1 itself? no: bystander
    const tank = put(s, them, 'mastiff', 1)                       // 4/3 GUARD blocker (decision 98), counters 4
    const finale = toHand(s, me, 'finale')
    s = applyAction(s, { type: 'play', card: finale, targets: [{ kind: 'unit', id: vet }] }, me).state
    s = applyAction(s, { type: 'attack', attackers: [vet], target: { kind: 'unit', id: wall } }, me).state
    expect(s.phase).toBe('block')
    s = applyAction(s, { type: 'block', pairs: [{ blocker: tank, onto: vet }] }, them).state
    // simultaneous: tank (3h) dies to the 4-power pour; vet takes 4 and dies in combat anyway.
    // no breakthrough → nothing reached the wall → the wall is NOT a victim and lives.
    expect(s.units[vet]).toBeUndefined()
    expect(s.units[tank]).toBeUndefined()
    expect(s.units[wall]).toBeDefined()
    expect(s.doom).toBeNull()
  })

  it('a blocker that survives the pour still dies to the doom afterward', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const vet = put(s, me, 'soldier', 1, { exhausted: true })    // 2/2
    const wall = put(s, them, 'wall', 1)                          // target
    const tank = put(s, them, 'mastiff', 1)                       // 4/3 GUARD blocker: takes 2, survives, counters 4
    const finale = toHand(s, me, 'finale')
    s = applyAction(s, { type: 'play', card: finale, targets: [{ kind: 'unit', id: vet }] }, me).state
    s = applyAction(s, { type: 'attack', attackers: [vet], target: { kind: 'unit', id: wall } }, me).state
    s = applyAction(s, { type: 'block', pairs: [{ blocker: tank, onto: vet }] }, them).state
    // vet died to the counter, but its attack wounded the tank — the doom still collects
    expect(s.units[vet]).toBeUndefined()
    expect(s.units[tank]).toBeUndefined()
    expect(s.units[wall]).toBeDefined()
    expect(s.doom).toBeNull()
  })
})
