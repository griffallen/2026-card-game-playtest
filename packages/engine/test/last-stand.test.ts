import { describe, it, expect } from 'vitest'
import type { CardSet, GameState, Seat } from '../src/types.ts'
import { homeZone } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { influenceFor } from '../src/helpers.ts'
import { T, toyDeck, put, toHand, fuel } from './util.ts'

// #107 (Last Stand): "Ready each of your units. They don't exhaust this round. For each of your units
//   that moves, lose 4 Influence. For each of your units that attacks, lose 4 Life. At the end of the
//   round, lose 8 Life and lose 8 Influence." Everything stacks as you take actions. New primitives:
//   a round-scoped per-seat pact list, the `lastStand` op, per-action tolls (move/attack), and the
//   end-of-round reckoning — all cleared at the round boundary.
//   #98 (2026-07-18, Griff): tolls 2->4, end reckoning 7->8, cost 7->8, 3->4 red pips.

const TT: CardSet = {
  ...T,
  // toy Last Stand — cost 1, no pips, so tests can play it without pip plumbing (same ops as the real card)
  laststand: {
    slug: 'laststand', name: 'laststand', color: 'red', type: 'action', cost: 1, text: '',
    onPlay: [{ op: 'ready', side: 'friendly' }, { op: 'lastStand', moveInfluence: 4, attackLife: 4, endLife: 8, endInfluence: 8 }],
  },
}

function v3game(seed = 21): GameState {
  let s = createGame({
    seed, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet: TT,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}
const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state
// after one of my actions the window is the opponent's — a single pass hands it straight back (streak resets on a real action)
const backToMe = (s: GameState, them: Seat) => act(s, them, { type: 'pass' })

describe('Last Stand — round-scoped no-exhaust pact with escalating tolls (#107)', () => {
  it('readies all of your units on play and registers the pact', () => {
    let s = v3game()
    const me = s.actorSeat
    const a1 = put(s, me, 'soldier', homeZone(me), { exhausted: true })
    const a2 = put(s, me, 'soldier', homeZone(me), { exhausted: true })
    const ls = toHand(s, me, 'laststand'); fuel(s, me, 3)
    s = act(s, me, { type: 'play', card: ls })
    expect(s.units[a1].exhausted).toBe(false)   // readied
    expect(s.units[a2].exhausted).toBe(false)
    expect(s.lastStands.filter(l => l.seat === me).length).toBe(1)
  })

  it("a unit that attacks doesn't exhaust — it can charge again — and each attack costs 4 Life", () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const atk = put(s, me, 'soldier', homeZone(them))   // 2/2, standing in the enemy Home to strike the base
    const ls = toHand(s, me, 'laststand'); fuel(s, me, 3)
    const life0 = s.sides[me].life, base0 = s.sides[them].life
    s = act(s, me, { type: 'play', card: ls })
    s = backToMe(s, them)
    s = act(s, me, { type: 'attack', attackers: [atk], target: { kind: 'base', seat: them } })
    expect(s.units[atk].exhausted).toBe(false)      // stayed ready
    expect(s.sides[me].life).toBe(life0 - 4)        // 4 Life toll for one attacking unit
    expect(s.sides[them].life).toBe(base0 - 2)      // the base took the 2-power hit
    s = backToMe(s, them)
    s = act(s, me, { type: 'attack', attackers: [atk], target: { kind: 'base', seat: them } })
    expect(s.units[atk].exhausted).toBe(false)      // still ready after a second charge
    expect(s.sides[me].life).toBe(life0 - 8)        // tolls stack across actions
    expect(s.sides[them].life).toBe(base0 - 4)
  })

  it('the attack toll is per attacking unit — a three-unit charge costs 12 Life', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const z = homeZone(them)
    const a1 = put(s, me, 'soldier', z), a2 = put(s, me, 'soldier', z), a3 = put(s, me, 'soldier', z)
    const ls = toHand(s, me, 'laststand'); fuel(s, me, 3)
    const life0 = s.sides[me].life
    s = act(s, me, { type: 'play', card: ls })
    s = backToMe(s, them)
    s = act(s, me, { type: 'attack', attackers: [a1, a2, a3], target: { kind: 'base', seat: them } })
    expect(s.sides[me].life).toBe(life0 - 12)   // 3 attackers × 4 Life
  })

  it('each move cedes 4 Influence, and the moving unit does not exhaust', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const mover = put(s, me, 'soldier', homeZone(me))
    const ls = toHand(s, me, 'laststand'); fuel(s, me, 3)
    s = act(s, me, { type: 'play', card: ls })
    const inf0 = influenceFor(s, me)
    s = backToMe(s, them)
    s = act(s, me, { type: 'move', unit: mover, to: 1 })
    expect(influenceFor(s, me)).toBe(inf0 - 4)   // the march cedes 4 Influence
    expect(s.units[mover].exhausted).toBe(false) // move did not exhaust it
  })

  it('everything stacks: a second cast doubles the per-move toll', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const mover = put(s, me, 'soldier', homeZone(me))
    const ls1 = toHand(s, me, 'laststand'), ls2 = toHand(s, me, 'laststand'); fuel(s, me, 4)
    s = act(s, me, { type: 'play', card: ls1 })
    s = backToMe(s, them)
    s = act(s, me, { type: 'play', card: ls2 })
    expect(s.lastStands.filter(l => l.seat === me).length).toBe(2)
    const inf0 = influenceFor(s, me)
    s = backToMe(s, them)
    s = act(s, me, { type: 'move', unit: mover, to: 1 })
    expect(influenceFor(s, me)).toBe(inf0 - 8)   // two pacts each bill the move — 4 + 4
  })

  it('at the end of the round the caster loses 8 Life and 8 Influence, then the pact clears', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const ls = toHand(s, me, 'laststand'); fuel(s, me, 3)
    const life0 = s.sides[me].life, inf0 = influenceFor(s, me)
    s = act(s, me, { type: 'play', card: ls })
    // both pass → the round ends and the reckoning fires
    s = act(s, them, { type: 'pass' })
    s = act(s, me, { type: 'pass' })
    expect(s.round).toBe(2)
    expect(s.sides[me].life).toBe(life0 - 8)
    expect(influenceFor(s, me)).toBe(inf0 - 8)
    expect(s.lastStands.length).toBe(0)          // the pact is a single round
  })

  it('the no-exhaust is gone next round — an attack exhausts as usual once the pact has cleared', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const atk = put(s, me, 'soldier', homeZone(them))
    const ls = toHand(s, me, 'laststand'); fuel(s, me, 3)
    s = act(s, me, { type: 'play', card: ls })
    s = act(s, them, { type: 'pass' })
    s = act(s, me, { type: 'pass' })              // round ends, pact clears
    expect(s.lastStands.length).toBe(0)
    // now in round 2 it's the initiative holder's window after the start steps; drive to an attack by `atk`
    while (s.phase === 'bank') s = act(s, s.actorSeat, { type: 'skipResource' })
    if (s.actorSeat !== me) s = act(s, s.actorSeat, { type: 'pass' })
    expect(s.actorSeat).toBe(me)
    s = act(s, me, { type: 'attack', attackers: [atk], target: { kind: 'base', seat: them } })
    expect(s.units[atk].exhausted).toBe(true)     // no pact → attacking exhausts again
  })

  it('real card is wired: cost 8, four red pips, action, mass-ready + lastStand toll ops', () => {
    const def = CARD_SET['last-stand']
    expect(def.cost).toBe(8)
    expect(def.pips).toEqual(['red', 'red', 'red', 'red'])
    expect(def.type).toBe('action')
    expect(def.onPlay).toEqual([
      { op: 'ready', side: 'friendly' },
      { op: 'lastStand', moveInfluence: 4, attackLife: 4, endLife: 8, endInfluence: 8 },
    ])
  })
})
