import { describe, it, expect } from 'vitest'
import type { CardDef, CardSet, GameState, Seat } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { effPower, effHealth } from '../src/helpers.ts'
import { stateBasedCleanup } from '../src/effects.ts'
import { validateCardSet } from '../src/validate.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { T, toyDeck, put } from './util.ts'

// #122 (Mechanic 1): a unit's base Power/Health read LIVE from a board count, REPLACING the printed
//   stat. 'handSize' = cards in the owner's hand (Umbral Colossus); 'discardUnitsBoth' = unit cards
//   across BOTH discard piles (The Unseen Court). No caching: the value tracks the board at query time,
//   and mods/auras/scar compose on top of the count exactly as on a printed stat.

const u = (slug: string, cost: number, power: number, health: number, extra: Partial<CardDef> = {}): CardDef =>
  ({ slug, name: slug, color: 'purple', type: 'unit', cost, power, health, text: '', ...extra })

const TT: CardSet = {
  ...T,
  // count-based bodies (no printed power/health — the count governs)
  colossus: { slug: 'colossus', name: 'colossus', color: 'purple', type: 'unit', cost: 6, text: '',
    powerFromCount: 'handSize', healthFromCount: 'handSize' },
  court: { slug: 'court', name: 'court', color: 'purple', type: 'unit', cost: 8, health: 8, text: '',
    powerFromCount: 'discardUnitsBoth' },
  // a plain low body used to fill the discard with a UNIT card (an action would not count)
  wisp: u('wisp', 1, 1, 1),
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

// set a seat's hand to exactly `n` throwaway cards, returning the ids
function setHand(s: GameState, seat: Seat, n: number): string[] {
  const ids: string[] = []
  let k = 90000
  s.sides[seat].hand = []
  for (let i = 0; i < n; i++) {
    const id = `hand${k++}`
    s.cardOf[id] = 'wisp'
    s.sides[seat].hand.push(id)
    ids.push(id)
  }
  return ids
}

describe('dynamic base stat — powerFromCount / healthFromCount (#122)', () => {
  it('handSize power AND health track live as the hand changes', () => {
    let s = v3game()
    const me = s.actorSeat
    const c = put(s, me, 'colossus', 1)
    setHand(s, me, 5)
    expect(effPower(s, s.units[c])).toBe(5)
    expect(effHealth(s, s.units[c])).toBe(5)
    // play a card down: the colossus shrinks in lockstep
    setHand(s, me, 3)
    expect(effPower(s, s.units[c])).toBe(3)
    expect(effHealth(s, s.units[c])).toBe(3)
    // it reads the OWNER's hand, not the opponent's
    setHand(s, (1 - me) as Seat, 9)
    expect(effPower(s, s.units[c])).toBe(3)
    expect(effHealth(s, s.units[c])).toBe(3)
  })

  it('discard-unit power grows as units die into the discard piles (both sides counted)', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const c = put(s, me, 'court', 1)
    expect(effPower(s, s.units[c])).toBe(0)     // empty discards → 0 power (a Hidden 0/8 wall)
    expect(effHealth(s, s.units[c])).toBe(8)    // printed Health 8 is untouched by the count
    // seed both discards with UNIT cards
    s.cardOf['d1'] = 'wisp'; s.sides[me].discard.push('d1')
    s.cardOf['d2'] = 'wisp'; s.sides[them].discard.push('d2')
    expect(effPower(s, s.units[c])).toBe(2)     // one unit card in each pile → 2
    // an ACTION card in the discard does NOT count (only type:'unit')
    s.cardOf['d3'] = 'bolt'; s.sides[them].discard.push('d3')
    expect(effPower(s, s.units[c])).toBe(2)
    // a real unit dying into discard bumps the count live
    const victim = put(s, them, 'wisp', 1)
    s.units[victim].damage = 99
    stateBasedCleanup(s, me)
    expect(s.units[victim]).toBeUndefined()     // it died
    expect(effPower(s, s.units[c])).toBe(3)      // its card is now a unit in the discard
  })

  it('empty hand → 0/0 → the colossus dies on the next state-based sweep', () => {
    let s = v3game()
    const me = s.actorSeat
    const c = put(s, me, 'colossus', 1)
    setHand(s, me, 0)
    expect(effHealth(s, s.units[c])).toBe(0)
    expect(effPower(s, s.units[c])).toBe(0)
    stateBasedCleanup(s, me)
    expect(s.units[c]).toBeUndefined()          // 0 damage >= 0 health → felled
  })

  it('entry-suicide: cast as your LAST card, it enters 0/0 and dies on entry (hand read AFTER it leaves)', () => {
    let s = v3game()
    const me = s.actorSeat
    // the colossus is the ONLY card in hand; give it the resources + pip presence to be castable
    const id = `play1`
    s.cardOf[id] = 'colossus'
    s.sides[me].hand = [id]
    // fuel: 6 ready resources for the cost (no pips required — colossus toy card has none)
    let k = 70000
    for (let i = 0; i < 6; i++) { const r = `r${k++}`; s.cardOf[r] = 'wisp'; s.sides[me].resources.push({ id: r, exhausted: false }) }
    s = act(s, me, { type: 'play', card: id })
    // hand emptied first, so it entered with 0 cards in hand → 0/0 → swept on the action tail
    expect(s.sides[me].hand.length).toBe(0)
    expect(s.units[id]).toBeUndefined()
    // it went to discard as a dead deck card (not a created copy)
    expect(s.sides[me].discard).toContain(id)
  })

  it('negative mods compose on TOP of the count base, floored at 0', () => {
    let s = v3game()
    const me = s.actorSeat
    const c = put(s, me, 'colossus', 1)
    setHand(s, me, 5)
    s.units[c].mods.push({ p: -2 })            // a Wither-style -2 Power
    expect(effPower(s, s.units[c])).toBe(3)     // 5 (count) − 2 = 3
    setHand(s, me, 1)
    expect(effPower(s, s.units[c])).toBe(0)     // max(0, 1 − 2) — the count floor is free
    // and health mods compose on the health count too
    s.units[c].mods.push({ h: -2 })
    setHand(s, me, 5)
    expect(effHealth(s, s.units[c])).toBe(3)    // 5 − 2
  })

  it('real cards are wired and the whole ledger validates', () => {
    const umbral = CARD_SET['umbral-colossus']
    expect(umbral.powerFromCount).toBe('handSize')
    expect(umbral.healthFromCount).toBe('handSize')
    expect((umbral.kw ?? []).map(k => k.k).sort()).toEqual(['infiltrate'])
    const uc = CARD_SET['the-unseen-court']
    expect(uc.powerFromCount).toBe('discardUnitsBoth')
    expect(uc.health).toBe(8)
    expect((uc.kw ?? []).map(k => k.k).sort()).toEqual(['hidden'])
    expect(uc.sneak).toBeUndefined()            // the old Sneak is gone
    expect(validateCardSet(CARD_SET)).toEqual([])
  })
})
