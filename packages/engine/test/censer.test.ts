import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { createGame } from '../src/setup.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { getLegalActions } from '../src/legal.ts'
import { validateCardSet } from '../src/validate.ts'
import { hasKw } from '../src/helpers.ts'
import type { GameAction, GameState, Seat } from '../src/types.ts'
import { put, toLoop } from './util.ts'

// ── #104 (Censer of Purity) — the martyr that draws its allies' wounds onto itself ──
// Two new engine pieces exercised here:
//   • the `activate` action carries a player-chosen numeric `amount` (the first free number
//     entry outside X-cost) plus a friendly-unit target — the CardDef `activated` channel
//   • the `moveDamage` op: transfer N damage from one unit onto another, capped so the sink
//     never falls below 0 Health; reaching exactly 0 kills it via the normal lethality path

const arena = (seed = 7): GameState => {
  let s = createGame({
    seed, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet: CARD_SET,
    players: [{ name: 'Ada', deck: deckSlugs(PREBUILT_DECKS[0]) }, { name: 'Bo', deck: deckSlugs(PREBUILT_DECKS[1]) }],
  })
  return toLoop(s)
}

const activatesFor = (s: GameState, seat: Seat, unit: string) =>
  getLegalActions(s, seat).filter((a): a is Extract<GameAction, { type: 'activate' }> => a.type === 'activate' && a.unit === unit)

describe('Censer of Purity (#104): the locked design', () => {
  it('compiles to Power 0, Health 6, two yellow pips, Tribune, and a moveDamage activated ability', () => {
    const def = CARD_SET['censer-of-purity']
    expect(def.type).toBe('unit')
    expect(def.cost).toBe(5)
    expect(def.power).toBe(0)
    expect(def.health).toBe(6)
    expect(def.pips).toEqual(['yellow', 'yellow'])
    expect((def.kw ?? []).some(k => k.k === 'tribune')).toBe(true)
    expect(def.activated).toBeTruthy()
    expect(def.activated!.ops.some(o => o.op === 'moveDamage')).toBe(true)
  })

  it('drops the old start-of-round influence engine entirely (Griff: "change text")', () => {
    const def = CARD_SET['censer-of-purity']
    expect(def.startOfRound).toBeUndefined()
    const anyInfluence = [def.onPlay, def.onDefend, def.onKill, def.onAttack, def.onDeath, def.onEnterZone]
      .some(ops => (ops ?? []).some(o => o.op === 'influence'))
    expect(anyInfluence).toBe(false)
  })

  it('validates cleanly under the card-set validator', () => {
    expect(validateCardSet(CARD_SET)).toEqual([])
  })
})

describe('Censer of Purity (#104): moving damage', () => {
  it('lifts N damage off a friendly unit and onto the Censer, exhausting it and spending the action', () => {
    let s = arena()
    const me = s.actorSeat
    const them = (1 - me) as Seat
    const censer = put(s, me, 'censer-of-purity', 0)
    const ally = put(s, me, 'crimson-behemoth', 0, { damage: 4 })   // 6/6 red body

    s = applyAction(s, { type: 'activate', unit: censer, targets: [{ kind: 'unit', id: ally }], amount: 3 }, me).state

    expect(s.units[ally].damage).toBe(1)          // 4 - 3
    expect(s.units[censer].damage).toBe(3)        // 0 + 3
    expect(s.units[censer].exhausted).toBe(true)  // the sacrifice exhausts the Censer
    expect(s.actorSeat).toBe(them)                // the action was spent — window advanced
  })

  it('caps the move at the ally\'s current damage (cannot move more than exists)', () => {
    let s = arena()
    const me = s.actorSeat
    const censer = put(s, me, 'censer-of-purity', 0)
    const ally = put(s, me, 'crimson-behemoth', 0, { damage: 2 })

    // only amounts 1..2 are legal (the ally carries 2 damage)
    const amounts = activatesFor(s, me, censer).map(a => a.amount).sort()
    expect(amounts).toEqual([1, 2])
    // an over-request is rejected, not silently clamped
    expect(() => applyAction(s, { type: 'activate', unit: censer, targets: [{ kind: 'unit', id: ally }], amount: 3 }, me))
      .toThrow()
  })

  it('caps the move at the Censer\'s remaining Health (cannot bring it below 0)', () => {
    let s = arena()
    const me = s.actorSeat
    const censer = put(s, me, 'censer-of-purity', 0)      // 6 Health, 0 damage → can absorb 6
    const ally = put(s, me, 'worldrender', 0, { damage: 7 })  // 4/8 body carrying 7 damage

    const amounts = activatesFor(s, me, censer).map(a => a.amount).sort((a, b) => (a ?? 0) - (b ?? 0))
    expect(amounts[0]).toBe(1)
    expect(Math.max(...amounts.map(a => a ?? 0))).toBe(6)   // capped at the Censer's Health, not the ally's 7
    expect(() => applyAction(s, { type: 'activate', unit: censer, targets: [{ kind: 'unit', id: ally }], amount: 7 }, me))
      .toThrow()
  })

  it('a full martyr\'s sacrifice: moving exactly the Censer\'s Health takes it to 0 and it dies', () => {
    let s = arena()
    const me = s.actorSeat
    const censer = put(s, me, 'censer-of-purity', 0)
    const ally = put(s, me, 'worldrender', 0, { damage: 7 })

    s = applyAction(s, { type: 'activate', unit: censer, targets: [{ kind: 'unit', id: ally }], amount: 6 }, me).state

    expect(s.units[censer]).toBeUndefined()       // reached exactly 0 Health → destroyed
    expect(s.sides[me].discard).toContain(censer) // fell like any unit
    expect(s.units[ally].damage).toBe(1)          // 7 - 6 lifted away
  })

  it('an already-damaged Censer can only absorb its remaining Health', () => {
    let s = arena()
    const me = s.actorSeat
    const censer = put(s, me, 'censer-of-purity', 0, { damage: 2 })  // 6 Health, 2 damage → 4 left
    const ally = put(s, me, 'worldrender', 0, { damage: 7 })

    const amounts = activatesFor(s, me, censer).map(a => a.amount ?? 0).sort((a, b) => a - b)
    expect(Math.max(...amounts)).toBe(4)          // remaining Health, not full Health
  })
})

describe('Censer of Purity (#104): the action economy & inert body', () => {
  it('cannot activate while exhausted, and offers no ability once the Censer is full', () => {
    let s = arena()
    const me = s.actorSeat
    const exhausted = put(s, me, 'censer-of-purity', 0, { exhausted: true })
    const full = put(s, me, 'censer-of-purity', 0, { damage: 6 })   // no remaining Health to absorb into
    const ally = put(s, me, 'crimson-behemoth', 0, { damage: 3 })

    expect(activatesFor(s, me, exhausted)).toHaveLength(0)
    expect(activatesFor(s, me, full)).toHaveLength(0)
    // an undamaged ally offers nothing to move — no ability against it
    put(s, me, 'crimson-behemoth', 0)   // undamaged
    const ready = put(s, me, 'censer-of-purity', 0)
    const targets = new Set(activatesFor(s, me, ready).map(a => a.targets?.[0]?.kind === 'unit' ? a.targets[0].id : ''))
    expect(targets.has(ally)).toBe(true)  // the damaged ally is offered
  })

  it('rejects targeting itself, an enemy, or an undamaged friendly unit', () => {
    let s = arena()
    const me = s.actorSeat
    const them = (1 - me) as Seat
    const censer = put(s, me, 'censer-of-purity', 0, { damage: 2 })
    const enemy = put(s, them, 'crimson-behemoth', 0, { damage: 4 })
    const undamaged = put(s, me, 'crimson-behemoth', 0)

    expect(() => applyAction(s, { type: 'activate', unit: censer, targets: [{ kind: 'unit', id: censer }], amount: 1 }, me)).toThrow()
    expect(() => applyAction(s, { type: 'activate', unit: censer, targets: [{ kind: 'unit', id: enemy }], amount: 1 }, me)).toThrow()
    expect(() => applyAction(s, { type: 'activate', unit: censer, targets: [{ kind: 'unit', id: undamaged }], amount: 1 }, me)).toThrow()
  })

  it('is an inert 0-Power Tribune body with no other triggers', () => {
    const def = CARD_SET['censer-of-purity']
    let s = arena()
    const me = s.actorSeat
    const censer = put(s, me, 'censer-of-purity', 0)
    expect(def.power).toBe(0)
    expect(hasKw(s, s.units[censer], 'tribune')).toBe(true)
    expect(def.onAttack).toBeUndefined()
    expect(def.onDefend).toBeUndefined()
    expect(def.onDeath).toBeUndefined()
  })
})
