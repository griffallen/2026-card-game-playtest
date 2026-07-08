import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { viewFor } from '../src/view.ts'
import { game, put, fuel, toHand, toLoop } from './util.ts'
import type { Seat } from '../src/types.ts'

describe('round structure (decision 40)', () => {
  it('runs both start steps in initiative order, then the loop starts with initiative', () => {
    let s = game() // zero-input setup → startRound already ran for initiative
    const first = s.initiative
    expect(s.phase).toBe('bank')
    expect(s.startStep).toBe(first)
    expect(s.actorSeat).toBe(first)
    // drew 7, auto-banked 2 (→5), round-1 start step drew firstRoundDraw=2 (→7)
    expect(s.sides[first].hand.length).toBe(7)
    s = applyAction(s, { type: 'skipResource' }, first).state
    const second = (1 - first) as Seat
    expect(s.startStep).toBe(second)
    expect(s.actorSeat).toBe(second)
    s = applyAction(s, { type: 'skipResource' }, second).state
    expect(s.phase).toBe('loop')
    expect(s.actorSeat).toBe(first)
  })

  it('banking a card is limited by resourcesPerRound and ends the step', () => {
    let s = game()
    const seat = s.actorSeat
    const card = s.sides[seat].hand[0]
    s = applyAction(s, { type: 'resource', card }, seat).state
    // cap = 1 → step auto-advances to the other seat's bank window
    expect(s.startStep).toBe(1 - seat)
  })

  it('two consecutive passes end the round; initiative stays when unclaimed', () => {
    let s = toLoop(game())
    const first = s.initiative
    expect(s.round).toBe(1)
    s = applyAction(s, { type: 'pass' }, s.actorSeat).state
    s = applyAction(s, { type: 'pass' }, s.actorSeat).state
    expect(s.round).toBe(2)
    expect(s.initiative).toBe(first)
    expect(s.phase).toBe('bank') // next round's start steps have begun
  })

  it('pass is soft: acting after an opponent pass reopens theirs', () => {
    let s = toLoop(game())
    const a = s.actorSeat, b = (1 - a) as Seat
    fuel(s, b, 1)
    const cheap = toHand(s, b, 'pawn')
    s = applyAction(s, { type: 'pass' }, a).state
    s = applyAction(s, { type: 'play', card: cheap }, b).state
    expect(s.round).toBe(1)          // round did NOT end
    expect(s.actorSeat).toBe(a)      // a may act again
    expect(s.passStreak).toBe(0)
  })

  it('claimInitiative takes the token, exits the round, opponent continues solo', () => {
    let s = toLoop(game())
    const a = s.actorSeat, b = (1 - a) as Seat
    s = applyAction(s, { type: 'claimInitiative' }, a).state
    expect(s.initiative).toBe(a)
    expect(s.outOfRound[a]).toBe(true)
    expect(s.actorSeat).toBe(b)
    fuel(s, b, 1)
    const cheap = toHand(s, b, 'pawn')
    s = applyAction(s, { type: 'play', card: cheap }, b).state
    expect(s.actorSeat).toBe(b)      // solo: window stays with b
    s = applyAction(s, { type: 'pass' }, b).state
    expect(s.round).toBe(2)          // single pass ends it after a claim
    expect(s.initiative).toBe(a)     // a goes first next round
  })

  it('a second claim in the same round is illegal', () => {
    let s = toLoop(game())
    const a = s.actorSeat, b = (1 - a) as Seat
    s = applyAction(s, { type: 'claimInitiative' }, a).state
    expect(() => applyAction(s, { type: 'claimInitiative' }, b)).toThrow()
  })

  it('the holder may claim their own token to lock it (decision 40)', () => {
    let s = toLoop(game())
    const holder = s.initiative
    s = applyAction(s, { type: 'claimInitiative' }, holder).state
    expect(s.initiative).toBe(holder)
    expect(s.outOfRound[holder]).toBe(true)
  })

  it('everyone readies at their own start step — both boards untap each round', () => {
    let s = toLoop(game())
    const a = s.actorSeat, b = (1 - a) as Seat
    const ua = put(s, a, 'soldier', 1, { exhausted: true, enteredRound: 0 })
    const ub = put(s, b, 'soldier', 1, { exhausted: true, enteredRound: 0 })
    s = applyAction(s, { type: 'pass' }, s.actorSeat).state
    s = applyAction(s, { type: 'pass' }, s.actorSeat).state
    s = toLoop(s) // round 2 loop
    expect(s.units[ua].exhausted).toBe(false)
    expect(s.units[ub].exhausted).toBe(false)
  })

  it('round 1 draws firstRoundDraw for BOTH players (decision 44: = drawPerRound)', () => {
    const s = game()
    expect(s.rules.firstRoundDraw).toBe(2)
    expect(s.rules.drawPerRound).toBe(2)
  })

  it('extraAction lets the same player act twice (decision 43 plumbing)', () => {
    let s = toLoop(game())
    const a = s.actorSeat
    s.pendingExtraAction = a
    fuel(s, a, 1)
    const cheap = toHand(s, a, 'pawn')
    s = applyAction(s, { type: 'play', card: cheap }, a).state
    expect(s.actorSeat).toBe(a)
    expect(s.pendingExtraAction).toBe(null)
  })

  it('viewFor exposes the round state the UIs need', () => {
    const s = toLoop(game())
    const v = viewFor(s, s.actorSeat)
    expect(v.round).toBe(1)
    expect(v.phase).toBe('loop')
    expect(v.initiative).toBe(s.initiative)
    expect(v.outOfRound).toEqual([false, false])
    expect(v.pendingAttack).toBe(null)
  })
})
