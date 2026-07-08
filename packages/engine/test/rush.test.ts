import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { game, put, fuel, toHand, toLoop } from './util.ts'

describe('decision 41: no summoning sickness, Rush = free entry-round move', () => {
  it('a freshly played unit can attack later this same round', () => {
    let s = toLoop(game())
    const a = s.actorSeat
    fuel(s, a, 2)
    put(s, (1 - a) as 0 | 1, 'pawn', a === 0 ? 0 : 2, { enteredRound: 0 }) // enemy in my home
    const soldier = toHand(s, a, 'soldier')
    s = applyAction(s, { type: 'play', card: soldier }, a).state
    s = applyAction(s, { type: 'pass' }, (1 - a) as 0 | 1).state
    const enemy = Object.values(s.units).find(u => u.owner !== a)!
    s = applyAction(s, { type: 'attack', attackers: [soldier], target: { kind: 'unit', id: enemy.id } }, a).state
    expect(s.units[soldier]?.exhausted).toBe(true) // it attacked — no sickness gate fired
  })

  it('a non-rush unit that moves the round it entered exhausts as normal', () => {
    let s = toLoop(game())
    const a = s.actorSeat
    const id = put(s, a, 'soldier', a === 0 ? 0 : 2, { enteredRound: s.round })
    s = applyAction(s, { type: 'move', unit: id, to: 1 }, a).state
    expect(s.units[id].exhausted).toBe(true)
  })

  it('a Rush unit moves without exhausting the round it entered — and can still attack', () => {
    let s = toLoop(game())
    const a = s.actorSeat
    const id = put(s, a, 'runner', a === 0 ? 0 : 2, { enteredRound: s.round })
    put(s, (1 - a) as 0 | 1, 'wall', 1, { enteredRound: 0 }) // 0-power wall: no counter, so the 1/1 runner survives to attack
    s = applyAction(s, { type: 'move', unit: id, to: 1 }, a).state
    expect(s.units[id].exhausted).toBe(false) // Rush waived the exhaust
    s = applyAction(s, { type: 'pass' }, (1 - a) as 0 | 1).state
    const enemy = Object.values(s.units).find(u => u.owner !== a && u.zone === 1)!
    s = applyAction(s, { type: 'attack', attackers: [id], target: { kind: 'unit', id: enemy.id } }, a).state
    expect(s.units[id]?.exhausted).toBe(true) // the attack still exhausts (rushCoversAttack=false)
  })

  it("Rush's waiver expires after the entry round", () => {
    let s = toLoop(game())
    const a = s.actorSeat
    const id = put(s, a, 'runner', a === 0 ? 0 : 2, { enteredRound: 0 }) // a veteran
    s = applyAction(s, { type: 'move', unit: id, to: 1 }, a).state
    expect(s.units[id].exhausted).toBe(true)
  })

  it('granted Rush on a VETERAN still exhausts on move — waiver keys on entry round (playtest finding 6, strict reading)', () => {
    // Design note: decision 41 grants the waiver "the round it enters play". A veteran granted Rush
    // mid-round did NOT enter this round, so RAW it still exhausts. Flagged as a designer question —
    // if playtests want granted-Rush to matter, revisit (rushCoversAttack, or a re-entry semantic).
    let s = toLoop(game())
    const a = s.actorSeat
    const id = put(s, a, 'soldier', a === 0 ? 0 : 2, { enteredRound: 0 })
    s.units[id].mods.push({ kw: { k: 'rush' }, round: true }) // granted Rush this round
    s = applyAction(s, { type: 'move', unit: id, to: 1 }, a).state
    expect(s.units[id].exhausted).toBe(true)
  })
})
