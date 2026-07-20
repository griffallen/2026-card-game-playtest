import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { createGame } from '../src/setup.ts'
import { DEFAULT_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { damageUnit, stateBasedCleanup } from '../src/effects.ts'
import { assertConservation, effArmor, effHealth, effPower, hasKw, thresholds, unitsOf } from '../src/helpers.ts'
import { viewFor } from '../src/view.ts'
import { homeZone } from '../src/types.ts'
import type { GameState, Seat, UnitInstance } from '../src/types.ts'
import { fuel, put, toHand, toLoop } from './util.ts'

// Issue #69 (Radiant Citadel) — the game's first unit-creation mechanic.
// Locked with Griff on the thread (stats ruled 2026-07-14 18:11): the Citadel is a
// 1/4 Armor 2 Guard Tribune that can't attack; on entering play, if it is the ONLY
// Radiant Citadel its controller owns in play, it raises two 0/1 copies (Guard,
// Tribune, cantAttack — no Armor) in the controller's Home, ready. The copies run
// the same entry check and fizzle (the recursion fuse: one cast → three walls).
// Created copies are not deck cards: they vanish on death, touching no discard pile.

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

/** Real-cards game advanced into the action loop, p1 = initiative holder, both fuelled. */
function arena(seed = 11) {
  let s = createGame({
    seed,
    rules: { ...DEFAULT_RULES, chooseStartingResources: false },
    cardSet: CARD_SET,
    players: [
      { name: 'Ada', deck: deckSlugs(PREBUILT_DECKS[0]) },
      { name: 'Bo', deck: deckSlugs(PREBUILT_DECKS[1]) },
    ],
  })
  s = toLoop(s)
  const p1 = s.actorSeat
  const p2 = (1 - p1) as Seat
  fuel(s, p1, 20)
  fuel(s, p2, 20)
  return { s, p1, p2 }
}

const citadels = (s: GameState, seat: Seat) =>
  unitsOf(s, seat).filter(u => u.slug === 'radiant-citadel')

/** Play a Radiant Citadel from hand for `seat` (assumes it's their window), returning its id. */
function castCitadel(s: GameState, seat: Seat): { s: GameState; id: string } {
  const id = toHand(s, seat, 'radiant-citadel')
  return { s: act(s, seat, { type: 'play', card: id }), id }
}

describe('Radiant Citadel — create-copies on entry (#69)', () => {
  it('your first Citadel raises two 0/1 copies in your Home: ready, Guard, Tribune, cantAttack, no Armor', () => {
    let { s, p1 } = arena()
    const cast = castCitadel(s, p1)
    s = cast.s
    const copies = citadels(s, p1).filter(u => u.id !== cast.id)
    expect(copies).toHaveLength(2)
    for (const c of copies) {
      expect(c.zone).toBe(homeZone(p1))
      expect(c.exhausted).toBe(false)                    // enters ready (no summoning sickness)
      expect(c.damage).toBe(0)
      expect(effPower(s, c)).toBe(0)
      expect(effHealth(s, c)).toBe(1)
      expect(effArmor(s, c)).toBe(0)                     // the 0/1 body carries no Armor
      expect(hasKw(s, c, 'guard')).toBe(true)
      expect(hasKw(s, c, 'tribune')).toBe(true)
      expect(hasKw(s, c, 'cantAttack')).toBe(true)
    }
  })

  it('the fuse: the copies run the same entry check and fizzle — one cast makes exactly three', () => {
    let { s, p1, p2 } = arena()
    s = castCitadel(s, p1).s
    expect(citadels(s, p1)).toHaveLength(3)              // parent + 2, not 7+
    expect(citadels(s, p2)).toHaveLength(0)
  })

  it('a second Citadel cast while you already own one creates nothing', () => {
    let { s, p1 } = arena()
    put(s, p1, 'radiant-citadel', homeZone(p1))
    s = castCitadel(s, p1).s
    const mine = citadels(s, p1)
    expect(mine).toHaveLength(2)                         // the standing one + the new cast, no copies
    for (const u of mine) expect(effHealth(s, u)).toBe(4)
  })

  it("the check counts YOUR copies only — an opponent's Citadels never block your spawn", () => {
    let { s, p1, p2 } = arena()
    put(s, p2, 'radiant-citadel', homeZone(p2))
    put(s, p2, 'radiant-citadel', homeZone(p2))
    s = castCitadel(s, p1).s
    expect(citadels(s, p1)).toHaveLength(3)
    expect(citadels(s, p2)).toHaveLength(2)              // theirs untouched, and no spawn for them
  })

  it('copies still count as Citadels you own after the parent falls', () => {
    let { s, p1 } = arena()
    const first = castCitadel(s, p1)
    s = first.s
    damageUnit(s, s.units[first.id], 10, 'test')         // fell the parent (10 - Armor 2 = 8 ≥ 4)
    stateBasedCleanup(s, p1)
    expect(s.units[first.id]).toBeUndefined()
    expect(citadels(s, p1)).toHaveLength(2)              // the two copies remain
    s = act(s, (1 - p1) as Seat, { type: 'pass' })       // back to p1's window
    s = castCitadel(s, p1).s
    expect(citadels(s, p1)).toHaveLength(3)              // copies blocked the spawn: 2 + the new cast
  })

  it('a created copy dies into nothing — no discard entry, no phantom card', () => {
    let { s, p1 } = arena()
    const cast = castCitadel(s, p1)
    s = cast.s
    const copy = citadels(s, p1).find(u => u.id !== cast.id) as UnitInstance
    const discardsBefore = s.sides.map(side => side.discard.length)
    damageUnit(s, copy, 3, 'test')
    stateBasedCleanup(s, p1)
    expect(s.units[copy.id]).toBeUndefined()
    expect(s.sides[0].discard).not.toContain(copy.id)
    expect(s.sides[1].discard).not.toContain(copy.id)
    expect(s.sides.map(side => side.discard.length)).toEqual(discardsBefore)
    expect(s.cardOf[copy.id]).toBeUndefined()            // no phantom instance left behind
    expect(() => assertConservation(s)).not.toThrow()
    expect(s.units[cast.id]).toBeDefined()               // the parent stands
  })

  it('the parent is a real deck card — it still dies into the discard', () => {
    let { s, p1 } = arena()
    const cast = castCitadel(s, p1)
    s = cast.s
    damageUnit(s, s.units[cast.id], 10, 'test')
    stateBasedCleanup(s, p1)
    expect(s.units[cast.id]).toBeUndefined()
    expect(s.sides[p1].discard).toContain(cast.id)
    expect(() => assertConservation(s)).not.toThrow()
  })

  it('the new body: 1/4, Armor 2, Guard, Tribune, cantAttack — and the old threshold static is gone', () => {
    const { s, p1 } = arena()
    const id = put(s, p1, 'radiant-citadel', homeZone(p1))
    const u = s.units[id]
    expect(effPower(s, u)).toBe(1)
    expect(effHealth(s, u)).toBe(4)
    expect(effArmor(s, u)).toBe(2)
    expect(hasKw(s, u, 'guard')).toBe(true)
    expect(hasKw(s, u, 'tribune')).toBe(true)
    expect(hasKw(s, u, 'cantAttack')).toBe(true)
    expect(CARD_SET['radiant-citadel'].statics ?? []).toEqual([])   // oppThreshold dropped (#69)
    expect(thresholds(s)).toEqual([20, 20])              // nobody's bar moves while it stands (±20 since #91)
  })

  it('the view teaches the copies as 0/1 bodies, not 1/4 cards', () => {
    let { s, p1 } = arena()
    const cast = castCitadel(s, p1)
    s = cast.s
    const view = viewFor(s, p1)
    const shown = view.zones[homeZone(p1)].units.filter(v => v.slug === 'radiant-citadel' && v.id !== cast.id)
    expect(shown).toHaveLength(2)
    for (const v of shown) {
      expect([v.power, v.health]).toEqual([0, 1])
      expect([v.basePower, v.baseHealth]).toEqual([0, 1])
      expect(v.keywords).toContain('guard')
      expect(v.keywords).toContain('tribune')
      expect(v.keywords).toContain('cantAttack')
      expect(v.keywords.some(k => k.startsWith('armor'))).toBe(false)
    }
  })
})
