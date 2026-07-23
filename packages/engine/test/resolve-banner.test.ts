import { describe, expect, it } from 'vitest'
import { CARD_SET } from '../src/cards/index.ts'
import { fireTrigger } from '../src/effects.ts'
import { effArmor, effHealth } from '../src/helpers.ts'
import { validateCardSet } from '../src/validate.ts'
import { game, put, toLoop } from './util.ts'

describe('Resolve Banner', () => {
  it('is the durable defensive upgrade: +2 Health, Armor 1, and a Life gain on defense', () => {
    const def = CARD_SET['resolve-banner']
    expect(def.type).toBe('upgrade')
    expect(def.cost).toBe(4)
    expect(def.pips).toEqual(['yellow', 'yellow'])
    expect(def.statics).toContainEqual({ s: 'aura', scope: 'attached', h: 2, armor: 1 })
    expect(def.onDefend).toContainEqual({ op: 'heal', t: 'selfBase', n: 1 })
    // Friendly attachment is the default upgrade behavior; no redundant attachment text is needed.
    expect(def.attach).toBeUndefined()
    expect(validateCardSet(CARD_SET)).toEqual([])
  })

  it('buffs its bearer and pays its controller once whenever that bearer defends', () => {
    const state = toLoop(game())
    state.cardSet = CARD_SET
    const owner = state.actorSeat
    const bearer = put(state, owner, 'exemplar-knight', 1)
    const upgrade = 'banner'
    state.cardOf[upgrade] = 'resolve-banner'
    state.upgrades[upgrade] = { id: upgrade, slug: 'resolve-banner', owner, attachedTo: bearer }
    state.units[bearer].upgrades.push(upgrade)

    expect(effHealth(state, state.units[bearer])).toBe(6)
    expect(effArmor(state, state.units[bearer])).toBe(1)
    const before = state.sides[owner].life
    fireTrigger({ state, actorSeat: owner }, state.units[bearer], 'onDefend')
    expect(state.sides[owner].life).toBe(before + 1)
  })
})
