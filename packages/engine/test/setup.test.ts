import { describe, expect, it } from 'vitest'
import { createGame } from '../src/setup.ts'
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

const make = (seed = 1) =>
  createGame({
    seed,
    rules: DEFAULT_RULES,
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

  it('deals per the spec: hand 5 after auto-resourcing 2 of 7; first player has drawn firstTurnDraw', () => {
    const s = make(3)
    const first = s.activeSeat
    const second = (1 - first) as 0 | 1
    // setup: draw 7, resource last 2 → 5 in hand. Then turn 1 auto-runs: first player draws 1 (firstTurnDraw).
    expect(s.sides[first].hand.length).toBe(6)
    expect(s.sides[second].hand.length).toBe(5)
    expect(s.sides[0].resources.length).toBe(2)
    expect(s.sides[1].resources.length).toBe(2)
    expect(s.sides[first].deck.length).toBe(48 - 7 - 1)
    expect(s.sides[second].deck.length).toBe(48 - 7)
    expect(s.turn).toBe(1)
    expect(s.phase).toBe('resource')
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
