import { describe, it, expect } from 'vitest'
import type { CardSet, GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'

// Decision 72 (issue #26, Griff): Reckless Charge's dead "gains Rush" mode becomes a real
// lunge — target unit immediately moves one zone, even if exhausted, without exhausting.
// New vocabulary: zone TargetSpec `adjacentToFirst` + op `move` to the chosen zone.
const K: CardSet = {
  ...T,
  charge: { slug: 'charge', name: 'charge', color: 'red', type: 'action', cost: 0, text: '',
    targets: [{ t: 'unit', side: 'friendly' }, { t: 'zone', adjacentToFirst: true }],
    onPlay: [{ op: 'move', t: 'chosen0', to: 'chosenZone' }] },
  herald: { slug: 'herald', name: 'herald', color: 'red', type: 'unit', cost: 2, power: 1, health: 3, text: '',
    onEnterZone: [{ op: 'influence', n: 1 }] },
}

function v3game(): GameState {
  let s = createGame({
    seed: 41,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: K,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}
let m = 9600
function give(s: GameState, seat: 0 | 1, slug: string): string {
  const id = `g${m++}`
  s.cardOf[id] = slug; s.sides[seat].hand.push(id)
  return id
}

describe('the lunge (decision 72)', () => {
  it('moves an EXHAUSTED unit one zone without exhausting anything further', () => {
    let s = v3game()
    const me = s.actorSeat
    const tired = put(s, me, 'soldier', 1, { exhausted: true })
    const card = give(s, me, 'charge')
    s = applyAction(s, { type: 'play', card, targets: [{ kind: 'unit', id: tired }, { kind: 'zone', zone: 2 }] }, me).state
    expect(s.units[tired].zone).toBe(2)
    expect(s.units[tired].exhausted).toBe(true)   // still spent — the lunge is free, not a ready
  })

  it('a ready unit lunges and STAYS ready — no move-exhaust', () => {
    let s = v3game()
    const me = s.actorSeat
    const fresh = put(s, me, 'soldier', 1)
    const card = give(s, me, 'charge')
    s = applyAction(s, { type: 'play', card, targets: [{ kind: 'unit', id: fresh }, { kind: 'zone', zone: 0 }] }, me).state
    expect(s.units[fresh].zone).toBe(0)
    expect(s.units[fresh].exhausted).toBe(false)
  })

  it('a lunge is an entrance: "enters a zone" triggers fire (post-storm audit U2)', () => {
    let s = v3game()
    const me = s.actorSeat
    const herald = put(s, me, 'herald', 1)
    const card = give(s, me, 'charge')
    const before = me === 0 ? s.influence : -s.influence
    s = applyAction(s, { type: 'play', card, targets: [{ kind: 'unit', id: herald }, { kind: 'zone', zone: 0 }] }, me).state
    const after = me === 0 ? s.influence : -s.influence
    expect(s.units[herald].zone).toBe(0)
    expect(after - before).toBe(1)   // the herald announces itself wherever it arrives
  })

  it('rejects a non-adjacent zone, and never offers one', () => {
    const s = v3game()
    const me = s.actorSeat
    const tired = put(s, me, 'soldier', 0, { exhausted: true })
    const card = give(s, me, 'charge')
    s.actorSeat = me
    expect(() => applyAction(s, { type: 'play', card, targets: [{ kind: 'unit', id: tired }, { kind: 'zone', zone: 2 }] }, me))
      .toThrowError(/adjacent/i)
    const offers = getLegalActions(s, me).filter(a => a.type === 'play' && a.card === card)
    const zonesFor = offers.filter(a => a.type === 'play' && a.targets?.[0].kind === 'unit' && a.targets[0].id === tired)
      .map(a => (a.type === 'play' && a.targets?.[1].kind === 'zone' ? a.targets[1].zone : -1))
    expect(zonesFor).toEqual([1])   // from zone 0, only the Neutral zone is one step away
  })
})
