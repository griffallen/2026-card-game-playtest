import { describe, it, expect } from 'vitest'
import type { GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { effPower, hasKw } from '../src/helpers.ts'
import { put, toHand, fuel } from './util.ts'

// Issue #45: the game's first X card. cost: X in the frontmatter, the declared X pays
// that many resources, and xSurge cedes X influence for +X power and Breakthrough this round.
function g(): GameState {
  let s = createGame({
    seed: 45, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet: CARD_SET,
    players: [{ name: 'G', deck: deckSlugs(PREBUILT_DECKS[0]) }, { name: 'M', deck: deckSlugs(PREBUILT_DECKS[1]) }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

describe('Reckless Abandon (X cost, issue #45)', () => {
  it('cardfile: cost X parses to xCost with cost 0', () => {
    const def = CARD_SET['reckless-abandon']
    expect(def.xCost).toBe(true)
    expect(def.cost).toBe(0)
  })

  it('pays X resources, cedes X influence, grants +X power and Breakthrough for the round', () => {
    let s = g()
    const me = s.actorSeat
    const u = put(s, me, 'berserker', 1)                       // real red body, no printed breakthrough
    expect(hasKw(s, s.units[u], 'breakthrough')).toBe(false)
    const card = toHand(s, me, 'reckless-abandon')
    fuel(s, me, 5)
    const before = s.influence
    const readyBefore = s.sides[me].resources.filter(r => !r.exhausted).length
    const powerBefore = effPower(s, s.units[u])
    s = applyAction(s, { type: 'play', card, targets: [{ kind: 'unit', id: u }], x: 3 }, me).state
    expect(s.sides[me].resources.filter(r => !r.exhausted).length).toBe(readyBefore - 3)
    expect(s.influence).toBe(me === 0 ? before - 3 : before + 3)
    expect(effPower(s, s.units[u])).toBe(powerBefore + 3)
    expect(hasKw(s, s.units[u], 'breakthrough')).toBe(true)
    // the surge dies with the round
    s = applyAction(s, { type: 'pass' }, (1 - me) as 0 | 1).state
    s = applyAction(s, { type: 'pass' }, me).state
    while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
    expect(effPower(s, s.units[u])).toBe(powerBefore)
    expect(hasKw(s, s.units[u], 'breakthrough')).toBe(false)
  })

  it('rejects a missing X and an X beyond ready resources', () => {
    let s = g()
    const me = s.actorSeat
    const u = put(s, me, 'berserker', 1)
    const card = toHand(s, me, 'reckless-abandon')
    fuel(s, me, 2)
    expect(() => applyAction(s, { type: 'play', card, targets: [{ kind: 'unit', id: u }] }, me))
      .toThrow(/costs X/)
    expect(() => applyAction(s, { type: 'play', card, targets: [{ kind: 'unit', id: u }], x: 99 }, me))
      .toThrow(/ready resources/)
  })

  it('enumerates one play per affordable X (0..ready) per target', () => {
    let s = g()
    const me = s.actorSeat
    put(s, me, 'berserker', 1)
    const card = toHand(s, me, 'reckless-abandon')
    s.sides[me].resources = []                                   // exact control of the bank
    for (let i = 0; i < 2; i++) {                                // real red cards — the pip gate reads them
      s.cardOf[`xr${i}`] = 'berserker'
      s.sides[me].resources.push({ id: `xr${i}`, exhausted: false })
    }
    const xs = getLegalActions(s, me)
      .filter(a => a.type === 'play' && a.card === card)
      .map(a => (a as { x?: number }).x)
    expect(xs.every(x => x !== undefined)).toBe(true)
    expect(Math.min(...(xs as number[]))).toBe(0)
    expect(Math.max(...(xs as number[]))).toBe(2)
  })
})
