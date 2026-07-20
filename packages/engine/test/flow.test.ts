import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { homeZone } from '../src/types.ts'
import type { GameState, Seat } from '../src/types.ts'
import { fuel, game, put, toHand, toLoop } from './util.ts'

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

// The round/initiative/pass/claim machinery is covered in round.test.ts; this file covers
// bank-window gating and the play/move/concede mechanics under the v2 action loop.

describe('bank phase (start steps)', () => {
  it('banking a card moves it face-up and ends the step', () => {
    let s = game()
    const seat = s.actorSeat
    const card = s.sides[seat].hand[0]
    s = act(s, seat, { type: 'resource', card })
    expect(s.sides[seat].resources.some(r => r.id === card)).toBe(true)
    // cap 1 reached → advanced to the other seat's start step (still bank phase)
    expect(s.phase).toBe('bank')
    expect(s.startStep).toBe(1 - seat)
  })

  it('only the seat whose window is open may act', () => {
    const s = game()
    const off = (1 - s.actorSeat) as Seat
    expect(() => act(s, off, { type: 'skipResource' })).toThrow(/window/)
  })

  it('both start steps skipped → the loop opens with the initiative holder', () => {
    const s = toLoop(game())
    expect(s.phase).toBe('loop')
    expect(s.actorSeat).toBe(s.initiative)
  })
})

describe('the action loop', () => {
  it('both players may act in their own windows (no active-player gate, decision 40)', () => {
    let s = toLoop(game())
    const a = s.actorSeat, b = (1 - a) as Seat
    const mine = put(s, b, 'soldier', 1, { enteredRound: 0 })   // b's ready veteran
    const enemy = put(s, a, 'pawn', 1, { enteredRound: 0 })
    s = act(s, a, { type: 'pass' })            // a passes → window hands to b
    expect(s.actorSeat).toBe(b)
    s = act(s, b, { type: 'attack', attackers: [mine], target: { kind: 'unit', id: enemy } }) // b attacks in its window
    expect(s.units[enemy]).toBeUndefined()
  })
})

describe('playing cards', () => {
  it('unit: pays cost by exhausting resources, enters home zone ready (no summoning sickness, decision 41)', () => {
    let s = toLoop(game())
    const p1 = s.actorSeat
    fuel(s, p1, 3)
    const card = toHand(s, p1, 'soldier')
    s = act(s, p1, { type: 'play', card })
    const unit = s.units[card]
    expect(unit.zone).toBe(homeZone(p1))
    expect(s.sides[p1].resources.filter(r => r.exhausted).length).toBe(2)
    // enters ready → can move this same round (opponent passes the window back)
    s = act(s, (1 - p1) as Seat, { type: 'pass' })
    s = act(s, p1, { type: 'move', unit: card, to: 1 })
    expect(s.units[card].zone).toBe(1)
  })

  it('cannot play without enough ready resources', () => {
    let s = toLoop(game())
    const p1 = s.actorSeat
    const card = toHand(s, p1, 'brute') // cost 3 > starting 2 resources
    expect(() => act(s, p1, { type: 'play', card })).toThrow(/resource/i)
  })
})

describe('movement', () => {
  it('moves one adjacent zone and exhausts; non-adjacent throws (adjacency binds everyone)', () => {
    let s = toLoop(game())
    const p1 = s.actorSeat
    const grunt = put(s, p1, 'soldier', homeZone(p1), { enteredRound: 0 })
    const bird = put(s, p1, 'hawk', homeZone(p1), { enteredRound: 0 })
    const far = homeZone((1 - p1) as Seat)
    expect(() => act(s, p1, { type: 'move', unit: grunt, to: far })).toThrow(/adjacent/i)
    s = act(s, p1, { type: 'move', unit: grunt, to: 1 })
    expect(s.units[grunt].zone).toBe(1)
    expect(s.units[grunt].exhausted).toBe(true)
    s = act(s, (1 - p1) as Seat, { type: 'pass' })
    // flying is retired: no unit skips adjacency any more
    expect(() => act(s, p1, { type: 'move', unit: bird, to: far })).toThrow(/adjacent/i)
    // exhausted grunt cannot move again
    expect(() => act(s, p1, { type: 'move', unit: grunt, to: 0 })).toThrow(/exhaust/i)
  })
})

describe('concede and game over', () => {
  it('concede ends the game immediately, from any window', () => {
    let s = toLoop(game())
    const winner = s.actorSeat
    const off = (1 - winner) as Seat
    s = act(s, off, { type: 'concede' })
    expect(s.winner).toBe(winner)
    expect(s.winReason).toBe('concede')
    expect(() => act(s, winner, { type: 'pass' })).toThrow(/over/i)
  })
})
