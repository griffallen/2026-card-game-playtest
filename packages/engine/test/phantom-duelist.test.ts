import { describe, it, expect } from 'vitest'
import type { CardDef, CardSet, GameState, Seat } from '../src/types.ts'
import { homeZone } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { validateCardSet } from '../src/validate.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { T, toyDeck, put } from './util.ts'

// #122 (Mechanic 2): Phantom Duelist takes NO reciprocal combat damage from any combatant it strictly
//   out-powers (effective Power) — as attacker (dodging a blocker's counter and an unblocked target's
//   retaliation) and as blocker (dodging the attacker's pour). It is NOT protected as the passive
//   declared TARGET of an attack: a 4/1 glass cannon still dies to a gang that sieges it directly.

const u = (slug: string, cost: number, power: number, health: number, extra: Partial<CardDef> = {}): CardDef =>
  ({ slug, name: slug, color: 'purple', type: 'unit', cost, power, health, text: '', ...extra })

const TT: CardSet = {
  ...T,
  phantom: u('phantom', 4, 4, 1, { kw: [{ k: 'hidden' }], dodgesWeakerCombatant: true }),
  wkguard: u('wkguard', 2, 2, 3, { kw: [{ k: 'guard' }] }),  // a weak guard (can block a duel)
  wk: u('wk', 2, 2, 3),                                      // a weak non-guard body
  peer: u('peer', 4, 4, 5),                                  // equal power — the tie case
  bigwall: u('bigwall', 2, 0, 20),                           // a fat 0-power target
  raider: u('raider', 2, 2, 9),                              // durable attacker (survives retaliation)
}

function v3game(seed = 21, cardSet: CardSet = TT): GameState {
  let s = createGame({
    seed, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}
const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

describe('Phantom Duelist — dodges reciprocal damage vs a weaker combatant (#122)', () => {
  it('as a BLOCKED attacker, dodges a weaker blocker\'s counter (and still deals its own)', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const atk = put(s, me, 'phantom', 1)         // 4/1, dodger
    const g = put(s, them, 'wkguard', 1)         // 2/3 guard — the declared target, self-blocks the duel
    s = act(s, me, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: g } })
    expect(s.phase).toBe('block')
    s = act(s, them, { type: 'block', pairs: [{ blocker: g, onto: atk }] })
    expect(s.units[atk].damage).toBe(0)          // 4 > 2 → dodged the guard's 2 counter
    expect(s.units[g]).toBeUndefined()           // still took Phantom's 4 — a 3-health guard falls
  })

  it('as a BLOCKER, dodges a weaker attacker\'s pour (and still deals its counter)', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const a1 = put(s, me, 'soldier', 1)          // 2/2 attacker (Phantom will block this one)
    const a2 = put(s, me, 'soldier', 1)          // 2/2 attacker (makes it a gang → blocking is legal)
    const wall = put(s, them, 'bigwall', 1)      // 0/20 declared target
    const ph = put(s, them, 'phantom', 1)        // 4/1 blocker
    s = act(s, me, { type: 'attack', attackers: [a1, a2], target: { kind: 'unit', id: wall } })
    expect(s.phase).toBe('block')
    s = act(s, them, { type: 'block', pairs: [{ blocker: ph, onto: a1 }] })
    expect(s.units[ph].damage).toBe(0)           // 4 > 2 → dodged a1's 2 pour
    expect(s.units[a1]).toBeUndefined()          // still took Phantom's 4 counter → dies
    expect(s.units[wall].damage).toBe(2)         // a2 got through for 2
  })

  it('as an UNBLOCKED attacker, dodges the declared target\'s retaliation', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const atk = put(s, me, 'phantom', 1)         // 4/1
    const x = put(s, them, 'wk', 1)              // 2/3, non-guard → no block window (duel law)
    s = act(s, me, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: x } })
    expect(s.phase).not.toBe('block')            // lone attacker, no guard → resolves unblocked
    expect(s.units[atk].damage).toBe(0)          // 4 > 2 → dodged the target's 2 retaliation
    expect(s.units[x]).toBeUndefined()           // took Phantom's 4 → dies
  })

  it('TAKES damage on a TIE — equal power is not strictly greater', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const atk = put(s, me, 'phantom', 1)         // 4/1
    const y = put(s, them, 'peer', 1)            // 4/5, non-guard
    s = act(s, me, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: y } })
    expect(s.units[atk]).toBeUndefined()         // 4 is NOT > 4 → took the 4 retaliation, 1 health → dies
    expect(s.units[y].damage).toBe(4)            // Phantom still dealt its 4
  })

  it('TAKES the primary hit as the passive sieged TARGET (site 4 is NOT dodged) — the glass cannon', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const a1 = put(s, me, 'raider', 1)           // 2/9 (durable — survives Phantom's strike-back)
    const a2 = put(s, me, 'raider', 1)           // 2/9
    const ph = put(s, them, 'phantom', 1, { exhausted: true })  // revealed (hidden protects only while ready)
    s = act(s, me, { type: 'attack', attackers: [a1, a2], target: { kind: 'unit', id: ph } })
    if (s.phase === 'block') s = act(s, them, { type: 'block', pairs: [] })
    expect(s.units[ph]).toBeUndefined()          // out-powers each attacker, but 4 (2+2) to the target fells the 1-health body
    expect(s.units[a1]).toBeDefined()            // it did strike back — but the durable raiders survive
  })

  it('base attack is a no-op for the dodge (no combatant), and a 0-power combatant is dodged', () => {
    // base attack — no combatant, Phantom just sieges the Home
    let s = v3game()
    let me = s.actorSeat, them = (1 - me) as Seat
    const atk = put(s, me, 'phantom', homeZone(them))   // stand in the enemy Home to strike the base
    const life0 = s.sides[them].life
    s = act(s, me, { type: 'attack', attackers: [atk], target: { kind: 'base', seat: them } })
    expect(s.sides[them].life).toBe(life0 - 4)   // 4 to the base
    expect(s.units[atk].damage).toBe(0)          // nothing reciprocal to a base

    // 0-power combatant — the strict-greater test is trivially true; the dodge holds
    s = v3game(22)
    me = s.actorSeat; them = (1 - me) as Seat
    const atk2 = put(s, me, 'phantom', 1)
    const wall = put(s, them, 'bigwall', 1)      // 0/20, non-guard → unblocked
    s = act(s, me, { type: 'attack', attackers: [atk2], target: { kind: 'unit', id: wall } })
    expect(s.units[atk2].damage).toBe(0)         // 4 > 0 → dodges (and a 0-power body deals nothing anyway)
    expect(s.units[wall].damage).toBe(4)
  })

  it('real card is wired: 4/1, hidden, dodgesWeakerCombatant — and the ledger validates', () => {
    const def = CARD_SET['phantom-duelist']
    expect(def.power).toBe(4)
    expect(def.health).toBe(1)
    expect((def.kw ?? []).map(k => k.k).sort()).toEqual(['hidden'])
    expect(def.dodgesWeakerCombatant).toBe(true)
    expect(validateCardSet(CARD_SET)).toEqual([])
  })
})
