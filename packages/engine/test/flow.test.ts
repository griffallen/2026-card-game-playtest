import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { homeZone } from '../src/types.ts'
import type { GameState, Seat } from '../src/types.ts'
import { fuel, game, put, toHand } from './util.ts'

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

describe('resource phase', () => {
  it('resourcing moves a hand card face-up to resources and opens main phase', () => {
    let s = game()
    const active = s.activeSeat
    const card = s.sides[active].hand[0]
    s = act(s, active, { type: 'resource', card })
    expect(s.sides[active].resources.some(r => r.id === card)).toBe(true)
    expect(s.phase).toBe('main')
    expect(s.actorSeat).toBe(active)
  })

  it('skipResource also opens main; resourcing twice in a turn is illegal', () => {
    let s = game()
    const active = s.activeSeat
    s = act(s, active, { type: 'skipResource' })
    expect(s.phase).toBe('main')
    expect(() => act(s, active, { type: 'resource', card: s.sides[active].hand[0] })).toThrow()
  })

  it('only the active seat may act in the resource phase', () => {
    const s = game()
    const off = (1 - s.activeSeat) as Seat
    expect(() => act(s, off, { type: 'skipResource' })).toThrow(/window/)
  })
})

describe('main phase alternation', () => {
  it('actor flips after each action; two consecutive passes end the turn', () => {
    let s = game()
    const p1 = s.activeSeat
    const p2 = (1 - p1) as Seat
    s = act(s, p1, { type: 'skipResource' })
    s = act(s, p1, { type: 'pass' })
    expect(s.actorSeat).toBe(p2)
    s = act(s, p2, { type: 'pass' })
    // both passed → next turn begins for p2
    expect(s.turn).toBe(2)
    expect(s.activeSeat).toBe(p2)
    expect(s.phase).toBe('resource')
    // p2 drew 2 (not the first-turn 1)
    expect(s.sides[p2].hand.length).toBe(5 + 2)
  })

  it('a non-pass action resets the pass streak', () => {
    let s = game()
    const p1 = s.activeSeat
    const p2 = (1 - p1) as Seat
    fuel(s, p2, 2)
    s = act(s, p1, { type: 'skipResource' })
    s = act(s, p1, { type: 'pass' })
    const card = toHand(s, p2, 'soldier')
    s = act(s, p2, { type: 'play', card })          // off-turn unit play is legal (D8/D9)
    expect(s.turn).toBe(1)
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'pass' })
    expect(s.turn).toBe(2)
  })

  it('off-turn seat cannot attack, move, or resource', () => {
    let s = game()
    const p1 = s.activeSeat
    const p2 = (1 - p1) as Seat
    const enemy = put(s, p1, 'pawn', 1)
    const mine = put(s, p2, 'soldier', 1)
    s = act(s, p1, { type: 'skipResource' })
    s = act(s, p1, { type: 'pass' })
    expect(() => act(s, p2, { type: 'attack', attacker: mine, target: { kind: 'unit', id: enemy } })).toThrow()
    expect(() => act(s, p2, { type: 'move', unit: mine, to: 2 })).toThrow()
    expect(() => act(s, p2, { type: 'resource', card: s.sides[p2].hand[0] })).toThrow()
  })
})

describe('playing cards', () => {
  it('unit: pays cost by exhausting resources, enters home zone summoning-sick', () => {
    let s = game()
    const p1 = s.activeSeat
    fuel(s, p1, 3)
    const card = toHand(s, p1, 'soldier')
    s = act(s, p1, { type: 'skipResource' })
    s = act(s, p1, { type: 'play', card })
    const unit = Object.values(s.units).find(u => u.id === card)!
    expect(unit.zone).toBe(homeZone(p1))
    expect(s.sides[p1].resources.filter(r => r.exhausted).length).toBe(2)
    // sick: cannot move or attack this turn (opponent passes to hand the window back)
    s = act(s, (1 - p1) as Seat, { type: 'pass' })
    expect(() => act(s, p1, { type: 'move', unit: card, to: 1 })).toThrow(/sick|turn/i)
  })

  it('rush units may move and attack the turn they land', () => {
    let s = game()
    const p1 = s.activeSeat
    fuel(s, p1, 2)
    const card = toHand(s, p1, 'runner')
    s = act(s, p1, { type: 'skipResource' })
    s = act(s, p1, { type: 'play', card })
    s = act(s, (1 - p1) as Seat, { type: 'pass' })
    s = act(s, p1, { type: 'move', unit: card, to: 1 })
    expect(s.units[card].zone).toBe(1)
    expect(s.units[card].exhausted).toBe(true)
  })

  it('cannot play without enough ready resources', () => {
    let s = game()
    const p1 = s.activeSeat
    const card = toHand(s, p1, 'brute') // cost 3 > starting 2 resources
    s = act(s, p1, { type: 'skipResource' })
    expect(() => act(s, p1, { type: 'play', card })).toThrow(/resource/i)
  })
})

describe('movement', () => {
  it('moves one adjacent zone and exhausts; non-adjacent throws; flying is free', () => {
    let s = game()
    const p1 = s.activeSeat
    const grunt = put(s, p1, 'soldier', homeZone(p1))
    const bird = put(s, p1, 'hawk', homeZone(p1))
    s = act(s, p1, { type: 'skipResource' })
    const far = homeZone((1 - p1) as Seat)
    expect(() => act(s, p1, { type: 'move', unit: grunt, to: far })).toThrow(/adjacent/i)
    s = act(s, p1, { type: 'move', unit: grunt, to: 1 })
    expect(s.units[grunt].zone).toBe(1)
    expect(s.units[grunt].exhausted).toBe(true)
    s = act(s, (1 - p1) as Seat, { type: 'pass' })
    s = act(s, p1, { type: 'move', unit: bird, to: far })  // flying skips adjacency
    expect(s.units[bird].zone).toBe(far)
    // exhausted grunt cannot move again
    s = act(s, (1 - p1) as Seat, { type: 'pass' })
    expect(() => act(s, p1, { type: 'move', unit: grunt, to: 0 })).toThrow(/exhaust/i)
  })

  it('imprisoned units cannot move', () => {
    let s = game()
    const p1 = s.activeSeat
    const jailed = put(s, p1, 'soldier', homeZone(p1), { imprisonedBy: (1 - p1) as Seat })
    s = act(s, p1, { type: 'skipResource' })
    expect(() => act(s, p1, { type: 'move', unit: jailed, to: 1 })).toThrow(/imprison/i)
  })
})

describe('concede and game over', () => {
  it('concede ends the game immediately, any window', () => {
    let s = game()
    const off = (1 - s.activeSeat) as Seat
    s = act(s, off, { type: 'concede' })
    expect(s.winner).toBe(s.activeSeat)
    expect(s.winReason).toBe('concede')
    expect(() => act(s, s.activeSeat, { type: 'skipResource' })).toThrow(/over/i)
  })
})
