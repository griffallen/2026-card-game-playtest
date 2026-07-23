import { describe, expect, it } from 'vitest'
import { CARD_SET } from '../src/cards/index.ts'
import { damageUnit, destroyUnit, fireTrigger } from '../src/effects.ts'
import { effPower } from '../src/helpers.ts'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import type { CardSet, GameState, Seat } from '../src/types.ts'
import { fuel, game, put, T, toHand, toLoop } from './util.ts'

function arena(...slugs: string[]): GameState {
  const state = toLoop(game())
  state.cardSet = { ...T, ...Object.fromEntries(slugs.map(slug => [slug, CARD_SET[slug]])) } as CardSet
  return state
}

describe('Yellow stateful reworks', () => {
  it('offers a printed Sentry only as a Neutral-zone deployment', () => {
    const state = arena('radiant-wall')
    const owner = state.actorSeat
    fuel(state, owner, 1)
    const card = toHand(state, owner, 'radiant-wall')
    const plays = getLegalActions(state, owner).filter(a => a.type === 'play' && a.card === card)
    expect(plays).toHaveLength(1)
    expect(plays[0]).toMatchObject({ type: 'play', zone: 1 })
  })

  it('Command Edict counts only units it actually readied for both Life and Hope loss', () => {
    let state = arena('command-edict')
    const owner = state.actorSeat
    const foe = (1 - owner) as Seat
    fuel(state, owner, 7)
    put(state, owner, 'soldier', 1, { exhausted: true })
    put(state, owner, 'pawn', 1)
    const card = toHand(state, owner, 'command-edict')
    const life = state.sides[foe].life
    const hope = state.hope[foe]
    state = applyAction(state, { type: 'play', card }, owner).state
    expect(state.sides[foe].life).toBe(life - 1)
    expect(state.hope[foe]).toBe(hope - 1)
  })

  it('sets a negative-Hope High Justiciar to the party size when it defends', () => {
    const state = arena('high-justiciar')
    const owner = state.actorSeat
    state.hope[owner] = 0
    const justiciar = put(state, owner, 'high-justiciar', 1)
    fireTrigger({ state, actorSeat: owner, attackerCount: 3 }, state.units[justiciar], 'onDefend')
    expect(effPower(state, state.units[justiciar])).toBe(3)
  })

  it('returns an Archon prisoner to its owner Home with one Health remaining', () => {
    const state = arena('archon-of-order')
    const owner = state.actorSeat
    const foe = (1 - owner) as Seat
    const archon = put(state, owner, 'archon-of-order', 1)
    const captive = put(state, foe, 'soldier', 1)
    const captiveUnit = state.units[captive]
    delete state.units[captive]
    state.captives[captive] = { unit: captiveUnit, by: archon }

    destroyUnit(state, state.units[archon], 'destroyed')
    expect(state.units[captive].zone).toBe(foe === 0 ? 0 : 2)
    expect(state.units[captive].damage).toBe(1)
    expect(state.units[captive].exhausted).toBe(false)
  })

  it('converts actual damage dealt to Radiant Citadel into Life', () => {
    const state = arena('radiant-citadel')
    const owner = state.actorSeat
    state.sides[owner].life = 15
    const citadel = put(state, owner, 'radiant-citadel', 1)
    damageUnit(state, state.units[citadel], 3, 'test') // Armor 2 leaves one actual damage.
    expect(state.units[citadel].damage).toBe(1)
    expect(state.sides[owner].life).toBe(16)
  })

  it('Sentence fixes its enemy host at 0 Power and bills that host’s controller on death', () => {
    const state = arena('sentence')
    const owner = state.actorSeat
    const foe = (1 - owner) as Seat
    const host = put(state, foe, 'soldier', 1)
    const upgrade = 'sentence-upgrade'
    state.cardOf[upgrade] = 'sentence'
    state.upgrades[upgrade] = { id: upgrade, slug: 'sentence', owner, attachedTo: host }
    state.units[host].upgrades.push(upgrade)
    const life = state.sides[foe].life

    expect(effPower(state, state.units[host])).toBe(0)
    destroyUnit(state, state.units[host], 'destroyed')
    expect(state.sides[foe].life).toBe(life - 2)
  })
})
