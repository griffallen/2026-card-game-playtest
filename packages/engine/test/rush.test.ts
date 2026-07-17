import { describe, expect, it } from 'vitest'
import type { GameState } from '../src/types.ts'
import { applyAction } from '../src/engine.ts'
import { fuel, game, put, toHand, toLoop } from './util.ts'

/** Both seats pass, then drive the next round's bank steps back to the loop (initiative carries over). */
function nextRound(s: GameState): GameState {
  s = applyAction(s, { type: 'pass' }, s.actorSeat).state
  s = applyAction(s, { type: 'pass' }, s.actorSeat).state
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

describe('#105: Rush is a static — the first move EACH round is free (supersedes decision 41 entry-round gate)', () => {
  it('a freshly played unit can attack later this same round (no summoning sickness)', () => {
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

  it('control: a non-Rush unit that moves the round it entered exhausts as normal', () => {
    let s = toLoop(game())
    const a = s.actorSeat
    const id = put(s, a, 'soldier', a === 0 ? 0 : 2, { enteredRound: s.round })
    s = applyAction(s, { type: 'move', unit: id, to: 1 }, a).state
    expect(s.units[id].exhausted).toBe(true)
  })

  it('control: a non-Rush VETERAN (entered an earlier round) still exhausts on move — the waiver is Rush-only, not round-only', () => {
    let s = toLoop(game())
    const a = s.actorSeat
    const id = put(s, a, 'soldier', a === 0 ? 0 : 2, { enteredRound: s.round })
    s = nextRound(s)                 // round 2: the soldier is now a veteran
    expect(s.round).toBe(2)
    s = applyAction(s, { type: 'move', unit: id, to: 1 }, s.actorSeat).state
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
    expect(s.units[id]?.exhausted).toBe(true) // the attack still exhausts (rushCoversAttack=false — Rush never lets a unit attack early)
  })

  it('#105: a Rush VETERAN (entered an earlier round) gets a FREE first move on a later round', () => {
    let s = toLoop(game())           // round 1
    const a = s.actorSeat
    const id = put(s, a, 'runner', a === 0 ? 0 : 2, { enteredRound: s.round })
    s = nextRound(s)                 // round 2: the runner is now a veteran
    expect(s.round).toBe(2)
    expect(s.units[id].movedThisRound).toBe(false) // reset at round start
    s = applyAction(s, { type: 'move', unit: id, to: 1 }, s.actorSeat).state
    expect(s.units[id].exhausted).toBe(false)      // NEW: the free move is every round, not just entry round
  })

  it('#105: the free move is FIRST-move-only — a Rush veteran that moves twice in a later round exhausts on the second', () => {
    let s = toLoop(game())
    const a = s.actorSeat
    const id = put(s, a, 'runner', a === 0 ? 0 : 2, { enteredRound: s.round })
    s = nextRound(s)                 // round 2, veteran
    const b = s.actorSeat
    s = applyAction(s, { type: 'move', unit: id, to: 1 }, b).state
    expect(s.units[id].exhausted).toBe(false)      // first move: waived
    s = applyAction(s, { type: 'pass' }, (1 - b) as 0 | 1).state // opponent acts (strict alternation)
    s = applyAction(s, { type: 'move', unit: id, to: b === 0 ? 0 : 2 }, b).state // reposition again
    expect(s.units[id].exhausted).toBe(true)       // waiver spent — a second move exhausts like any unit
  })

  it('#105: the free move REFRESHES — spend it one round, get a new one next round', () => {
    let s = toLoop(game())
    const a = s.actorSeat
    const id = put(s, a, 'runner', a === 0 ? 0 : 2, { enteredRound: s.round })
    s = applyAction(s, { type: 'move', unit: id, to: 1 }, a).state // round 1: move free
    expect(s.units[id].exhausted).toBe(false)
    expect(s.units[id].movedThisRound).toBe(true)  // waiver consumed this round
    s = nextRound(s)                                // round 2
    expect(s.units[id].movedThisRound).toBe(false)  // refreshed at round start
    expect(s.units[id].exhausted).toBe(false)       // readied at round start
    s = applyAction(s, { type: 'move', unit: id, to: a === 0 ? 0 : 2 }, s.actorSeat).state
    expect(s.units[id].exhausted).toBe(false)       // free again — a fresh first move
  })

  it('#105: granted Rush now waives the move — a veteran granted Rush this round moves free', () => {
    // Under decision 41 this exhausted (the waiver keyed on the entry round; a veteran didn't qualify).
    // #105 keys the waiver on HAVING Rush + it being the first move — so granted Rush finally matters.
    let s = toLoop(game())
    const a = s.actorSeat
    const id = put(s, a, 'soldier', a === 0 ? 0 : 2, { enteredRound: 0 })
    s.units[id].mods.push({ kw: { k: 'rush' }, round: true }) // granted Rush this round
    s = applyAction(s, { type: 'move', unit: id, to: 1 }, a).state
    expect(s.units[id].exhausted).toBe(false)
  })
})

