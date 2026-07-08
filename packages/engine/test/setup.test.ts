import { describe, expect, it } from 'vitest'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { DEFAULT_RULES } from '../src/rules.ts'
import type { CardSet } from '../src/types.ts'

// Minimal vanilla card set for setup tests — no effects needed. 12 slugs × 4 copies = legal 48.
const CARDS: CardSet = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [
    `grunt${i}`,
    { slug: `grunt${i}`, name: `Grunt ${i}`, color: 'red', type: 'unit', cost: 1, power: 1, health: 1, text: '' },
  ]),
) as CardSet
const deck = (n = 48) => Array.from({ length: n }, (_, i) => `grunt${Math.floor(i / 4) % 12}`)

const make = (seed = 1, choose = false) =>
  createGame({
    seed,
    rules: { ...DEFAULT_RULES, chooseStartingResources: choose },
    cardSet: CARDS,
    players: [
      { name: 'Ada', deck: deck() },
      { name: 'Bo', deck: deck() },
    ],
  })

describe('createGame', () => {
  it('is deterministic: same seed → identical state', () => {
    expect(make(7)).toEqual(make(7))
  })

  it('different seeds differ', () => {
    const a = make(1)
    const b = make(2)
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b))
  })

  it('deals per the spec: hand 5 after auto-banking 2 of 7; initiative drew firstRoundDraw at its start step', () => {
    const s = make(3)
    const first = s.initiative
    const second = (1 - first) as 0 | 1
    // setup: draw 7, auto-bank last 2 → 5 in hand. Then round 1: initiative's start step draws firstRoundDraw (2) → 7.
    expect(s.sides[first].hand.length).toBe(7)
    expect(s.sides[second].hand.length).toBe(5)      // second's start step hasn't run yet
    expect(s.sides[0].resources.length).toBe(2)
    expect(s.sides[1].resources.length).toBe(2)
    expect(s.sides[first].deck.length).toBe(48 - 7 - 2)
    expect(s.sides[second].deck.length).toBe(48 - 7)
    expect(s.round).toBe(1)
    expect(s.phase).toBe('bank')
    expect(s.actorSeat).toBe(first)
    expect(s.influence).toBe(0)
    expect(s.sides[0].life).toBe(20)
    expect(s.winner).toBeNull()
  })

  it('conserves cards: every instance is in exactly one place', () => {
    const s = make(9)
    for (const seat of [0, 1] as const) {
      const side = s.sides[seat]
      const inPlay = Object.values(s.units).filter(u => u.owner === seat).length
        + Object.values(s.upgrades).filter(u => u.owner === seat).length
      const total = side.deck.length + side.hand.length + side.resources.length + side.discard.length + inPlay
      expect(total).toBe(48)
    }
    const allIds = [
      ...s.sides.flatMap(side => [...side.deck, ...side.hand, ...side.resources.map(r => r.id), ...side.discard]),
    ]
    expect(new Set(allIds).size).toBe(96)
    for (const id of allIds) expect(s.cardOf[id]).toBeDefined()
  })

  it('setup phase (decision 31): players choose their banks, first player first', () => {
    let s = make(4, true)
    const first = s.initiative
    const second = (1 - first) as 0 | 1
    expect(s.phase).toBe('setup')
    expect(s.actorSeat).toBe(first)
    expect(s.sides[first].hand.length).toBe(7)     // nothing auto-banked
    expect(s.sides[first].resources.length).toBe(0)

    const pickA = s.sides[first].hand.slice(0, 2)
    // illegal shapes first
    expect(() => applyAction(s, { type: 'setupBank', cards: [pickA[0]] }, first)).toThrow(/exactly 2/)
    expect(() => applyAction(s, { type: 'setupBank', cards: [pickA[0], pickA[0]] }, first)).toThrow(/distinct/)
    expect(() => applyAction(s, { type: 'setupBank', cards: pickA }, second)).toThrow(/window/)
    expect(() => applyAction(s, { type: 'skipResource' }, first)).toThrow(/setup/)

    s = applyAction(s, { type: 'setupBank', cards: pickA }, first).state
    expect(s.sides[first].resources.map(r => r.id)).toEqual(pickA)
    expect(s.sides[first].hand.length).toBe(5)
    expect(s.phase).toBe('setup')
    expect(s.actorSeat).toBe(second)

    const pickB = s.sides[second].hand.slice(3, 5)
    s = applyAction(s, { type: 'setupBank', cards: pickB }, second).state
    // both banked → round 1 ran: initiative's start step drew firstRoundDraw (2)
    expect(s.phase).toBe('bank')
    expect(s.actorSeat).toBe(first)
    expect(s.round).toBe(1)
    expect(s.sides[first].hand.length).toBe(5 + 2)
    expect(s.sides[second].resources.length).toBe(2)
  })

  it('mulligans redraw one fewer each time and floor at the bank size (decision 32)', () => {
    let s = make(6, true)
    const first = s.initiative
    expect(s.sides[first].hand.length).toBe(7)
    s = applyAction(s, { type: 'mulligan' }, first).state
    expect(s.sides[first].hand.length).toBe(6)
    expect(s.mulligans[first]).toBe(1)
    s = applyAction(s, { type: 'mulligan' }, first).state
    s = applyAction(s, { type: 'mulligan' }, first).state
    s = applyAction(s, { type: 'mulligan' }, first).state
    s = applyAction(s, { type: 'mulligan' }, first).state   // down to 2 = the bank size
    expect(s.sides[first].hand.length).toBe(2)
    expect(() => applyAction(s, { type: 'mulligan' }, first)).toThrow(/bank/)
    // conservation intact and banking still works
    const picks = [...s.sides[first].hand]
    s = applyAction(s, { type: 'setupBank', cards: picks }, first).state
    expect(s.sides[first].hand.length).toBe(0)
    expect(s.sides[first].resources.length).toBe(2)
  })

  it('drawing from an empty deck costs 1 life and 1 influence per missing card (decision 33)', () => {
    let s = make(8, false)
    const first = s.initiative
    const other = (1 - first) as 0 | 1
    // drain the OTHER player's deck so their start-step double draw whiffs twice
    const side = s.sides[other]
    side.discard.push(...side.deck)
    side.deck = []
    // initiative ends its start step → the other player's start step draws 2 from an empty deck
    s = applyAction(s, { type: 'skipResource' }, first).state
    expect(s.sides[other].life).toBe(20 - 2)
    const inf = other === 0 ? s.influence : -s.influence
    expect(inf).toBe(-2)
  })

  it('rejects rules configs with unimplemented param values (fail loudly, not silently — audit F7)', () => {
    expect(() => createGame({
      seed: 1, cardSet: CARDS, players: [{ name: 'A', deck: deck() }, { name: 'B', deck: deck() }],
      rules: { ...DEFAULT_RULES, counterAssignment: 'defender' },
    })).toThrow(/counterAssignment/)
    expect(() => createGame({
      seed: 1, cardSet: CARDS, players: [{ name: 'A', deck: deck() }, { name: 'B', deck: deck() }],
      rules: { ...DEFAULT_RULES, armorPerAttack: 'perAttacker' },
    })).toThrow(/armorPerAttack/)
  })

  it('rejects illegal decks', () => {
    expect(() =>
      createGame({
        seed: 1, rules: DEFAULT_RULES, cardSet: CARDS,
        players: [{ name: 'A', deck: deck(47) }, { name: 'B', deck: deck() }],
      }),
    ).toThrow(/48/)
    expect(() =>
      createGame({
        seed: 1, rules: DEFAULT_RULES, cardSet: CARDS,
        players: [{ name: 'A', deck: Array(48).fill('grunt0') }, { name: 'B', deck: deck() }],
      }),
    ).toThrow(/cop/i)
    expect(() =>
      createGame({
        seed: 1, rules: DEFAULT_RULES, cardSet: CARDS,
        players: [{ name: 'A', deck: [...deck(47), 'nope'] }, { name: 'B', deck: deck() }],
      }),
    ).toThrow(/unknown/i)
  })
})
