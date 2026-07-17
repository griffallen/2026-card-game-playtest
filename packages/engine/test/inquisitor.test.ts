import { describe, it, expect } from 'vitest'
import type { CardDef, CardSet, GameState, Seat } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { T, toyDeck, put, toHand, fuel } from './util.ts'

// #104 (Inquisitor): capture an enemy unit with 4 or less Power, Cost, OR remaining Health — any ONE
//   of the three qualifies. Exercises the new `anyOf` target predicate (an OR of maxPower / maxCost /
//   maxRemainingHealth, ANDed with the enemy-side constraint) in both legal enumeration and validation.

const u = (slug: string, cost: number, power: number, health: number, extra: Partial<CardDef> = {}): CardDef =>
  ({ slug, name: slug, color: 'yellow', type: 'unit', cost, power, health, text: '', ...extra })

const TT: CardSet = {
  ...T,
  inq: u('inq', 6, 3, 4, {
    kw: [{ k: 'capture' }],
    targets: [{ t: 'unit', side: 'enemy', anyOf: { maxPower: 4, maxCost: 4, maxRemainingHealth: 4 } }],
    onPlay: [{ op: 'capture', t: 'chosen0' }],
  }),
  powtgt: u('powtgt', 6, 4, 8),   // qualifies by Power only (4≤4; cost 6, health 8)
  costtgt: u('costtgt', 3, 6, 8),  // qualifies by Cost only (3≤4; power 6, health 8)
  hptgt: u('hptgt', 6, 6, 8),      // qualifies by remaining Health only once damaged (power 6, cost 6)
  nonetgt: u('nonetgt', 6, 6, 8),  // qualifies by NONE (power 6, cost 6, remaining 8)
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

/** Play the Inquisitor at target `id` and return the resulting state. */
function capture(s: GameState, me: Seat, targetId: string): GameState {
  const inq = toHand(s, me, 'inq'); fuel(s, me, 6)
  return act(s, me, { type: 'play', card: inq, targets: [{ kind: 'unit', id: targetId }] })
}

describe('Inquisitor — capture on Power OR Cost OR remaining Health ≤ 4 (#104)', () => {
  it('captures a low-Power enemy (Power 4, but Cost 6 / Health 8)', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const tgt = put(s, them, 'powtgt', 1)
    s = capture(s, me, tgt)
    expect(s.units[tgt]).toBeUndefined()   // removed from play
    expect(s.captives[tgt]).toBeDefined()  // held captive
  })

  it('captures a low-Cost enemy (Cost 3, but Power 6 / Health 8)', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const tgt = put(s, them, 'costtgt', 1)
    s = capture(s, me, tgt)
    expect(s.units[tgt]).toBeUndefined()
    expect(s.captives[tgt]).toBeDefined()
  })

  it('captures an enemy worn down to 4 remaining Health (Power 6 / Cost 6, damaged to 4 left)', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const tgt = put(s, them, 'hptgt', 1, { damage: 4 })   // 8 health − 4 damage = 4 remaining
    s = capture(s, me, tgt)
    expect(s.units[tgt]).toBeUndefined()
    expect(s.captives[tgt]).toBeDefined()
  })

  it('cannot capture an enemy that meets none of the three caps (Power 6 / Cost 6 / Health 8)', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const tgt = put(s, them, 'nonetgt', 1)
    const inq = toHand(s, me, 'inq'); fuel(s, me, 6)
    // not offered as a legal target...
    const legal = getLegalActions(s, me).filter(a => a.type === 'play' && a.card === inq)
    const targetsOffered = legal.flatMap(a => (a as { targets?: { id?: string }[] }).targets ?? []).map(t => t.id)
    expect(targetsOffered).not.toContain(tgt)
    // ...and rejected if forced
    expect(() => applyAction(s, { type: 'play', card: inq, targets: [{ kind: 'unit', id: tgt }] }, me))
      .toThrow(/caps|target/i)
  })

  it('an undamaged big body (remaining Health 8) is safe, but the SAME body is capturable once at 4 left', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const safe = put(s, them, 'nonetgt', 1)                    // remaining 8
    const worn = put(s, them, 'nonetgt', 1, { damage: 4 })    // remaining 4
    const inq = toHand(s, me, 'inq'); fuel(s, me, 6)
    const offered = getLegalActions(s, me)
      .filter(a => a.type === 'play' && a.card === inq)
      .flatMap(a => (a as { targets?: { id?: string }[] }).targets ?? []).map(t => t.id)
    expect(offered).toContain(worn)       // remaining-Health cap catches the worn one
    expect(offered).not.toContain(safe)   // the fresh one is out of reach
  })

  it('friendly units are never captured, whatever their stats', () => {
    const s = v3game()
    const me = s.actorSeat
    const mine = put(s, me, 'powtgt', 1)   // my own low-Power unit
    const inq = toHand(s, me, 'inq'); fuel(s, me, 6)
    const offered = getLegalActions(s, me)
      .filter(a => a.type === 'play' && a.card === inq)
      .flatMap(a => (a as { targets?: { id?: string }[] }).targets ?? []).map(t => t.id)
    expect(offered).not.toContain(mine)
  })

  it('real card is wired: enemy-side capture with the OR-of-caps predicate', () => {
    const def = CARD_SET['inquisitor']
    expect(def.targets).toEqual([{ t: 'unit', side: 'enemy', anyOf: { maxPower: 4, maxCost: 4, maxRemainingHealth: 4 } }])
    expect(def.onPlay).toEqual([{ op: 'capture', t: 'chosen0' }])
  })
})
