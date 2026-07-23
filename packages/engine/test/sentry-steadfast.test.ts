import { describe, expect, it } from 'vitest'
import type { CardSet, GameState, Seat } from '../src/types.ts'
import { applyAction } from '../src/engine.ts'
import { fireTrigger } from '../src/effects.ts'
import { getLegalActions } from '../src/legal.ts'
import { game, put, T, toHand, toLoop } from './util.ts'

const S: CardSet = {
  ...T,
  sentry: { slug: 'sentry', name: 'Sentry', color: 'yellow', type: 'unit', cost: 2, power: 1, health: 5, text: '', kw: [{ k: 'sentry' }] },
  steadfast: { slug: 'steadfast', name: 'Steadfast', color: 'yellow', type: 'unit', cost: 2, power: 1, health: 5, text: '', kw: [{ k: 'steadfast', n: 2 }] },
  authority: {
    slug: 'authority', name: 'Authority', color: 'yellow', type: 'action', cost: 0, text: '',
    targets: [{ t: 'unit', side: 'friendly' }],
    onPlay: [{ op: 'grantTrigger', t: 'chosen0', key: 'onAttackBase', ops: [{ op: 'healFromBaseDamage' }], dur: 'round' }],
  },
}

function s(): GameState {
  const state = toLoop(game())
  state.cardSet = S
  return state
}

describe('Sentry', () => {
  it('deploys directly into Neutral, and nowhere else', () => {
    let state = s()
    const owner = state.actorSeat
    const card = toHand(state, owner, 'sentry')
    state = applyAction(state, { type: 'play', card, zone: 1 }, owner).state
    expect(state.units[card].zone).toBe(1)

    const otherState = s()
    const otherOwner = otherState.actorSeat
    const second = toHand(otherState, otherOwner, 'sentry')
    expect(() => applyAction(otherState, { type: 'play', card: second, zone: otherOwner === 0 ? 0 : 2 }, otherOwner))
      .toThrow(/Neutral/i)
  })

  it('cannot attack or make a normal move', () => {
    let state = s()
    const me = state.actorSeat
    const sentry = put(state, me, 'sentry', 1)
    expect(() => applyAction(state, { type: 'move', unit: sentry, to: me === 0 ? 0 : 2 }, me)).toThrow(/sentr/i)
    expect(() => applyAction(state, { type: 'attack', attackers: [sentry], target: { kind: 'unit', id: put(state, (1 - me) as Seat, 'pawn', 1) } }, me)).toThrow(/sentr/i)
  })

  it('does not offer impossible normal moves in the action list', () => {
    let state = s()
    const owner = state.actorSeat
    const sentry = put(state, owner, 'sentry', 1)
    const enemy = (1 - owner) as Seat
    const invader = put(state, enemy, 'soldier', 1)

    expect(getLegalActions(state, owner).some(a => a.type === 'move' && a.unit === sentry)).toBe(false)
    state.actorSeat = enemy
    expect(getLegalActions(state, enemy).some(a => a.type === 'move' && a.unit === invader && a.to === (owner === 0 ? 0 : 2))).toBe(false)
  })

  it('holds enemies in its zone away from its controller Home while ready, but allows retreat', () => {
    const state = s()
    const sentryOwner = state.actorSeat
    const enemy = (1 - sentryOwner) as Seat
    put(state, sentryOwner, 'sentry', 1)
    const invader = put(state, enemy, 'soldier', 1)
    state.actorSeat = enemy
    expect(() => applyAction(state, { type: 'move', unit: invader, to: sentryOwner === 0 ? 0 : 2 }, enemy)).toThrow(/sentry/i)
    const retreat = applyAction(state, { type: 'move', unit: invader, to: enemy === 0 ? 0 : 2 }, enemy).state
    expect(retreat.units[invader].zone).toBe(enemy === 0 ? 0 : 2)
  })

  it('stops protecting while exhausted', () => {
    const state = s()
    const sentryOwner = state.actorSeat
    const enemy = (1 - sentryOwner) as Seat
    put(state, sentryOwner, 'sentry', 1, { exhausted: true })
    const invader = put(state, enemy, 'soldier', 1)
    state.actorSeat = enemy
    const moved = applyAction(state, { type: 'move', unit: invader, to: sentryOwner === 0 ? 0 : 2 }, enemy).state
    expect(moved.units[invader].zone).toBe(sentryOwner === 0 ? 0 : 2)
  })

  it('prevents base attacks while it stands ready in its controller Home', () => {
    const state = s()
    const defender = (1 - state.actorSeat) as Seat
    const attacker = state.actorSeat
    const home = defender === 0 ? 0 : 2
    put(state, defender, 'sentry', home)
    const invader = put(state, attacker, 'soldier', home)
    expect(() => applyAction(state, { type: 'attack', attackers: [invader], target: { kind: 'base', seat: defender } }, attacker)).toThrow(/sentry/i)
  })
})

describe('Steadfast', () => {
  it('gains Hope only the first time its unit defends in a round', () => {
    const state = s()
    const owner = state.actorSeat
    const unit = put(state, owner, 'steadfast', 1)
    const before = state.hope[owner]
    fireTrigger({ state, actorSeat: owner }, state.units[unit], 'onDefend')
    fireTrigger({ state, actorSeat: owner }, state.units[unit], 'onDefend')
    expect(state.hope[owner] - before).toBe(2)
  })
})

describe('temporary attack-base triggers', () => {
  it('can restore Life by the actual base damage dealt', () => {
    let state = s()
    const owner = state.actorSeat
    const unit = put(state, owner, 'soldier', owner === 0 ? 2 : 0)
    const card = toHand(state, owner, 'authority')
    state.sides[owner].life = 15
    state = applyAction(state, { type: 'play', card, targets: [{ kind: 'unit', id: unit }] }, owner).state

    fireTrigger({ state, actorSeat: owner, baseDamage: 3 }, state.units[unit], 'onAttackBase')
    expect(state.sides[owner].life).toBe(18)
  })
})
