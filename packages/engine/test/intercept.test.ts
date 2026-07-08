import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { game, put, toLoop } from './util.ts'
import type { Seat } from '../src/types.ts'

/** Board: attacker seat A has `slugs` in zone 1; defender seat B has `defSlugs` in zone 1. */
function duel(slugs: string[], defSlugs: string[]) {
  let s = toLoop(game())
  const a = s.actorSeat, b = (1 - a) as Seat
  const atk = slugs.map(slug => put(s, a, slug, 1, { enteredRound: 0 }))
  const def = defSlugs.map(slug => put(s, b, slug, 1, { enteredRound: 0 }))
  return { s, a, b, atk, def }
}

describe('multi-unit attack + intercept (decision 42)', () => {
  it('combined power hits as one hit; armor applies once', () => {
    // two soldiers (2+2) vs plated (armor 2, health 3): 4-2=2 damage — not 2×(2-2)=0
    let { s, a, atk, def } = duel(['soldier', 'soldier'], ['plated'])
    s = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a).state
    expect(s.phase).toBe('loop') // no other ready defender → no intercept window
    expect(s.units[def[0]].damage).toBe(2)
  })

  it('counter-damage goes to the highest-power attacker only', () => {
    let { s, a, atk, def } = duel(['pawn', 'brute'], ['soldier']) // brute p4 eats the counter
    s = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a).state
    expect(s.units[atk[0]]?.damage ?? 0).toBe(0)   // pawn untouched
    // brute took soldier's 2 power; soldier (h2) died to 5 combined — simultaneous, so the counter still lands
    expect(s.units[atk[1]].damage).toBe(2)
  })

  it('defender may intercept with a ready unit in the zone; interceptor exhausts', () => {
    let { s, a, b, atk, def } = duel(['brute'], ['pawn', 'soldier'])
    s = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a).state
    expect(s.phase).toBe('intercept')
    expect(s.actorSeat).toBe(b)
    const legal = getLegalActions(s, b)
    expect(legal).toContainEqual({ type: 'intercept', unit: def[1] })
    expect(legal).toContainEqual({ type: 'declineIntercept' })
    s = applyAction(s, { type: 'intercept', unit: def[1] }, b).state
    expect(s.units[def[0]].damage).toBe(0)          // pawn untouched
    expect(s.units[def[1]]?.exhausted ?? true).toBe(true) // soldier stepped in and exhausted (or died)
    expect(s.phase).toBe('loop')
    expect(s.actorSeat).toBe(b)                     // alternation resumes from the attacker
  })

  it('Guard intercepts without exhausting', () => {
    let { s, a, b, atk, def } = duel(['pawn'], ['pawn', 'guardian'])
    s = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a).state
    s = applyAction(s, { type: 'intercept', unit: def[1] }, b).state
    expect(s.units[def[1]].exhausted).toBe(false)
  })

  it('Guard no longer forces targeting — attacking past a guard is legal', () => {
    let { s, a, def } = duel(['soldier'], ['pawn', 'guardian'])
    const legal = getLegalActions(s, a)
    expect(legal.some(x => x.type === 'attack' && x.target.kind === 'unit' && x.target.id === def[0])).toBe(true)
  })

  it('base attacks can be intercepted', () => {
    let s = toLoop(game())
    const a = s.actorSeat, b = (1 - a) as Seat
    const enemyHome = (b === 0 ? 0 : 2) as 0 | 2
    const atk = put(s, a, 'brute', enemyHome, { enteredRound: 0 })
    const wall = put(s, b, 'guardian', enemyHome, { enteredRound: 0 })
    const life = s.sides[b].life
    s = applyAction(s, { type: 'attack', attackers: [atk], target: { kind: 'base', seat: b } }, a).state
    expect(s.phase).toBe('intercept')
    s = applyAction(s, { type: 'intercept', unit: wall }, b).state
    expect(s.sides[b].life).toBe(life)              // base never took the hit
    expect(s.units[wall]).toBeUndefined()           // the 1/3 guard soaked 4 and fell
  })

  it('no ready defender → attack resolves immediately (auto-passed window)', () => {
    let { s, a, atk, def } = duel(['soldier'], ['pawn'])
    const r = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a)
    expect(r.state.phase).toBe('loop')
  })

  it('declineIntercept resolves against the declared target', () => {
    let { s, a, b, atk, def } = duel(['soldier'], ['pawn', 'soldier'])
    s = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a).state
    s = applyAction(s, { type: 'declineIntercept' }, b).state
    expect(s.units[def[0]]).toBeUndefined() // pawn (1h) died to 2 power
  })

  it('breakthrough caps at the SUM of attacker values, on the final target', () => {
    // crusher (p3, bt2) + soldier (p2) vs pawn (h1): 5 dealt, 4 excess, capped at 2
    let { s, a, b, atk, def } = duel(['crusher', 'soldier'], ['pawn'])
    const before = s.sides[b].life
    s = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a).state
    expect(s.sides[b].life).toBe(before - 2)
  })

  it('per-unit overextend adds power now and bills at end of round', () => {
    let s = toLoop(game())
    const a = s.actorSeat, b = (1 - a) as Seat
    const loner = put(s, a, 'loner', 1, { enteredRound: 0 })                       // 2/2, overextend 3
    const pawn = put(s, a, 'pawn', 1, { enteredRound: 0 })                         // 1 power
    const brute = put(s, b, 'brute', 1, { enteredRound: 0, imprisonedBy: a })      // imprisoned: deals no counter
    s = applyAction(s, { type: 'attack', attackers: [loner, pawn], target: { kind: 'unit', id: brute }, overextend: [loner] }, a).state
    expect(s.units[brute]).toBeUndefined()          // (2+3)+1 = 6 ≥ 3 health — the gamble converted the kill
    expect(s.units[loner].overextendedBy).toBe(3)   // survived (no counter) — the end-of-round bill stands
  })

  it('attackers must share a zone; ranged-only groups may shoot an adjacent zone', () => {
    let s = toLoop(game())
    const a = s.actorSeat, b = (1 - a) as Seat
    const near = put(s, a, 'soldier', 1, { enteredRound: 0 })
    const far = put(s, a, 'soldier', (a === 0 ? 0 : 2), { enteredRound: 0 })
    const tgt = put(s, b, 'brute', 1, { enteredRound: 0 })
    expect(() => applyAction(s, { type: 'attack', attackers: [near, far], target: { kind: 'unit', id: tgt } }, a))
      .toThrow()
    const archers = [put(s, a, 'archer', (a === 0 ? 0 : 2), { enteredRound: 0 }),
                     put(s, a, 'archer', (a === 0 ? 0 : 2), { enteredRound: 0 })]
    const r = applyAction(s, { type: 'attack', attackers: archers, target: { kind: 'unit', id: tgt } }, a)
    expect(r.state.units[tgt]).toBeUndefined()       // 2+2 = 4 ≥ 3 health — combined hit killed it
    expect(r.state.units[archers[0]].damage).toBe(0) // cross-zone ranged: no counter
  })

  it('onDefend fires for the interceptor, not the spared target', () => {
    let { s, a, b, atk, def } = duel(['pawn'], ['pawn', 'guardian']) // guardian carries onDefend +1 (util.ts)
    const before = s.influence
    s = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a).state
    s = applyAction(s, { type: 'intercept', unit: def[1] }, b).state
    const gained = Math.abs(s.influence - before)
    expect(gained).toBe(1)
  })
})
