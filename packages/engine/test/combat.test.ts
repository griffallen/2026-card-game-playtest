import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { homeZone } from '../src/types.ts'
import type { GameState, Seat } from '../src/types.ts'
import { fuel, game, put, toHand, toLoop } from './util.ts'

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

/** A game advanced into the action loop with clean zones; p1 = initiative holder (acts first). */
function arena() {
  const s = toLoop(game())
  const p1 = s.actorSeat
  const p2 = (1 - p1) as Seat
  return { s, p1, p2 }
}

describe('attacks', () => {
  it('same-zone attack: simultaneous damage both ways; deaths go to discard with conservation', () => {
    let { s, p1, p2 } = arena()
    const atk = put(s, p1, 'brute', 1)      // 4/3
    const def = put(s, p2, 'soldier', 1)    // 2/2
    s = act(s, p1, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: def } })
    expect(s.units[def]).toBeUndefined()                       // died
    expect(s.sides[p2].discard).toContain(def)
    expect(s.units[atk].damage).toBe(2)                        // counter-damage landed
    expect(s.units[atk].exhausted).toBe(true)
  })

  it('mutual destruction works and both discard', () => {
    let { s, p1, p2 } = arena()
    const a = put(s, p1, 'soldier', 1)
    const b = put(s, p2, 'soldier', 1)
    s = act(s, p1, { type: 'attack', attackers: [a], target: { kind: 'unit', id: b } })
    expect(s.units[a]).toBeUndefined()
    expect(s.units[b]).toBeUndefined()
  })

  it('cannot attack cross-zone without ranged; ranged hits adjacent but never base', () => {
    let { s, p1, p2 } = arena()
    const melee = put(s, p1, 'soldier', homeZone(p1))
    const bow = put(s, p1, 'archer', 1)
    const far = put(s, p2, 'pawn', homeZone(p2))
    const near = put(s, p2, 'pawn', homeZone(p2))
    expect(() => act(s, p1, { type: 'attack', attackers: [melee], target: { kind: 'unit', id: far } })).toThrow(/zone/i)
    s = act(s, p1, { type: 'attack', attackers: [bow], target: { kind: 'unit', id: near } })  // adjacent: neutral → p2 home
    expect(s.units[near]).toBeUndefined()
    expect(s.units[bow].damage).toBe(0)     // cross-zone ranged draws no counter-damage
  })

  it('exhausted units cannot attack', () => {
    let { s, p1, p2 } = arena()
    const tired = put(s, p1, 'soldier', 1, { exhausted: true })
    const tgt = put(s, p2, 'pawn', 1)
    expect(() => act(s, p1, { type: 'attack', attackers: [tired], target: { kind: 'unit', id: tgt } })).toThrow(/exhaust/i)
  })

  it('armor reduces damage in both directions', () => {
    let { s, p1, p2 } = arena()
    const tank = put(s, p1, 'plated', 1)     // 2/3 armor 2
    const foe = put(s, p2, 'brute', 1)       // 4/3
    s = act(s, p1, { type: 'attack', attackers: [tank], target: { kind: 'unit', id: foe } })
    expect(s.units[foe].damage).toBe(2)      // full 2 lands
    expect(s.units[tank].damage).toBe(2)     // 4 − armor 2
  })

  it('imprisoned defenders deal no counter-damage and their guard is inert', () => {
    let { s, p1, p2 } = arena()
    const atk = put(s, p1, 'soldier', 1)
    const jailedGuard = put(s, p2, 'guardian', 1, { imprisonedBy: p1 })
    const soft = put(s, p2, 'pawn', 1)
    // guard is imprisoned → may attack the other unit instead (which counters normally)
    s = act(s, p1, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: soft } })
    expect(s.units[soft]).toBeUndefined()
    expect(s.units[atk].damage).toBe(1)
    // and attacking the imprisoned unit draws no counter-damage
    const atk2 = put(s, p1, 'soldier', 1)
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'attack', attackers: [atk2], target: { kind: 'unit', id: jailedGuard } })
    expect(s.units[atk2].damage).toBe(0)
  })
})

describe('guard (single-attacker forced targeting — superseded by intercept in Task 3)', () => {
  it('forces attacks onto guard units while any stands ready', () => {
    let { s, p1, p2 } = arena()
    const atk = put(s, p1, 'brute', 1)
    const shield = put(s, p2, 'guardian', 1)  // 1/3 guard
    const juicy = put(s, p2, 'pawn', 1)
    expect(() => act(s, p1, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: juicy } })).toThrow(/guard/i)
    s = act(s, p1, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: shield } })
    expect(s.units[shield]).toBeUndefined()
  })

  it('protects the base too', () => {
    let { s, p1, p2 } = arena()
    const atk = put(s, p1, 'brute', homeZone(p2))
    put(s, p2, 'guardian', homeZone(p2))
    expect(() => act(s, p1, { type: 'attack', attackers: [atk], target: { kind: 'base', seat: p2 } })).toThrow(/guard/i)
  })
})

describe('the base', () => {
  it('can only be attacked from inside the enemy home zone; deals no counter-damage', () => {
    let { s, p1, p2 } = arena()
    const away = put(s, p1, 'brute', 1)
    const sieger = put(s, p1, 'brute', homeZone(p2))
    expect(() => act(s, p1, { type: 'attack', attackers: [away], target: { kind: 'base', seat: p2 } })).toThrow(/home/i)
    s = act(s, p1, { type: 'attack', attackers: [sieger], target: { kind: 'base', seat: p2 } })
    expect(s.sides[p2].life).toBe(16)
    expect(s.units[sieger].damage).toBe(0)
  })

  it('life 0 ends the game', () => {
    let { s, p1, p2 } = arena()
    s.sides[p2].life = 3
    const sieger = put(s, p1, 'brute', homeZone(p2))
    s = act(s, p1, { type: 'attack', attackers: [sieger], target: { kind: 'base', seat: p2 } })
    expect(s.winner).toBe(p1)
    expect(s.winReason).toBe('life')
  })
})

describe('breakthrough and overextend', () => {
  it('breakthrough N carries excess damage to the controller, capped at N', () => {
    let { s, p1, p2 } = arena()
    const atk = put(s, p1, 'crusher', 1)    // 3/3 breakthrough 2
    const chump = put(s, p2, 'pawn', 1)     // 1/1 → excess 2, cap 2
    s = act(s, p1, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: chump } })
    expect(s.sides[p2].life).toBe(18)
    // cap check: 4/3 excess would be 3 vs breakthrough 2 → still 2
    const atk2 = put(s, p1, 'crusher', 1)
    const chump2 = put(s, p2, 'pawn', 1, { damage: 0 })
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'attack', attackers: [atk2], target: { kind: 'unit', id: chump2 } })
    expect(s.sides[p2].life).toBe(16)
  })

  it('overextend is an opt-in gamble: without it, no bonus (decision 35)', () => {
    let { s, p1, p2 } = arena()
    const gambler = put(s, p1, 'loner', 1)  // 2/2, overextend 3
    const big = put(s, p2, 'brute', 1)      // 4/3
    s = act(s, p1, { type: 'attack', attackers: [gambler], target: { kind: 'unit', id: big } })
    expect(s.units[big]).toBeDefined()
    expect(s.units[big].damage).toBe(2)
  })

  it('overextend converts a kill now and bills self-damage at end of round', () => {
    let { s, p1, p2 } = arena()
    const safeGambler = put(s, p1, 'loner', 2)                 // 2/2, overextend 3
    const chump = put(s, p2, 'brute', 2, { imprisonedBy: p1 }) // imprisoned: deals no counter-damage
    s = act(s, p1, { type: 'attack', attackers: [safeGambler], target: { kind: 'unit', id: chump }, overextend: [safeGambler] })
    expect(s.units[chump]).toBeUndefined()                     // 2+3 = 5 ≥ 3 health — the gamble converted the kill
    expect(s.units[safeGambler].overextendedBy).toBe(3)
    // end the round (two consecutive passes) → 3 self-damage kills the 2/2
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'pass' })
    expect(s.units[safeGambler]).toBeUndefined()
  })

  it('units without the Overextend keyword cannot take the gamble', () => {
    let { s, p1, p2 } = arena()
    const plain = put(s, p1, 'soldier', 1)
    const foe = put(s, p2, 'pawn', 1)
    expect(() => act(s, p1, { type: 'attack', attackers: [plain], target: { kind: 'unit', id: foe }, overextend: [plain] }))
      .toThrow(/overextend/i)
  })
})

describe('simultaneity policy', () => {
  it('if both players hit 0 life at once, the acting player wins', () => {
    let { s, p1, p2 } = arena()
    fuel(s, p1, 1)
    s.sides[p1].life = 0
    s.sides[p2].life = 0
    const card = toHand(s, p1, 'bolt')
    // any action triggers the state check; p1 acts → p1 wins the tie
    const res = applyAction(s, { type: 'play', card, targets: [{ kind: 'unit', id: put(s, p2, 'wall', 1) }] }, p1)
    expect(res.state.winner).toBe(p1)
  })
})
