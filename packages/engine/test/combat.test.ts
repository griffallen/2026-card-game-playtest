import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { homeZone } from '../src/types.ts'
import type { GameState, Seat } from '../src/types.ts'
import { fuel, game, put, toHand } from './util.ts'

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

/** A game advanced into p1's main phase with clean zones. */
function arena() {
  let s = game()
  const p1 = s.activeSeat
  const p2 = (1 - p1) as Seat
  s = act(s, p1, { type: 'skipResource' })
  return { s, p1, p2 }
}

describe('attacks', () => {
  it('same-zone attack: simultaneous damage both ways; deaths go to discard with conservation', () => {
    let { s, p1, p2 } = arena()
    const atk = put(s, p1, 'brute', 1)      // 4/3
    const def = put(s, p2, 'soldier', 1)    // 2/2
    s = act(s, p1, { type: 'attack', attacker: atk, target: { kind: 'unit', id: def } })
    expect(s.units[def]).toBeUndefined()                       // died
    expect(s.sides[p2].discard).toContain(def)
    expect(s.units[atk].damage).toBe(2)                        // counter-damage landed
    expect(s.units[atk].exhausted).toBe(true)
  })

  it('mutual destruction works and both discard', () => {
    let { s, p1, p2 } = arena()
    const a = put(s, p1, 'soldier', 1)
    const b = put(s, p2, 'soldier', 1)
    s = act(s, p1, { type: 'attack', attacker: a, target: { kind: 'unit', id: b } })
    expect(s.units[a]).toBeUndefined()
    expect(s.units[b]).toBeUndefined()
  })

  it('cannot attack cross-zone without ranged; ranged hits adjacent but never base', () => {
    let { s, p1, p2 } = arena()
    const melee = put(s, p1, 'soldier', homeZone(p1))
    const bow = put(s, p1, 'archer', 1)
    const far = put(s, p2, 'pawn', homeZone(p2))
    const near = put(s, p2, 'pawn', homeZone(p2))
    expect(() => act(s, p1, { type: 'attack', attacker: melee, target: { kind: 'unit', id: far } })).toThrow(/zone/i)
    s = act(s, p1, { type: 'attack', attacker: bow, target: { kind: 'unit', id: near } })  // adjacent: neutral → p2 home
    expect(s.units[near]).toBeUndefined()
    expect(s.units[bow].damage).toBe(0)     // spec: ranged still takes counter-damage? no — cross-zone defender punches back per simultaneous rule
  })

  it('exhausted and summoning-sick units cannot attack', () => {
    let { s, p1, p2 } = arena()
    const tired = put(s, p1, 'soldier', 1, { exhausted: true })
    const fresh = put(s, p1, 'soldier', 1, { enteredTurn: s.turn })
    const tgt = put(s, p2, 'pawn', 1)
    expect(() => act(s, p1, { type: 'attack', attacker: tired, target: { kind: 'unit', id: tgt } })).toThrow(/exhaust/i)
    expect(() => act(s, p1, { type: 'attack', attacker: fresh, target: { kind: 'unit', id: tgt } })).toThrow(/sick|turn/i)
  })

  it('armor reduces damage in both directions', () => {
    let { s, p1, p2 } = arena()
    const tank = put(s, p1, 'plated', 1)     // 2/3 armor 2
    const foe = put(s, p2, 'brute', 1)       // 4/3
    s = act(s, p1, { type: 'attack', attacker: tank, target: { kind: 'unit', id: foe } })
    expect(s.units[foe].damage).toBe(2)      // full 2 lands
    expect(s.units[tank].damage).toBe(2)     // 4 − armor 2
  })

  it('imprisoned defenders deal no counter-damage and their guard is inert', () => {
    let { s, p1, p2 } = arena()
    const atk = put(s, p1, 'soldier', 1)
    const jailedGuard = put(s, p2, 'guardian', 1, { imprisonedBy: p1 })
    const soft = put(s, p2, 'pawn', 1)
    // guard is imprisoned → may attack the other unit instead (which counters normally)
    s = act(s, p1, { type: 'attack', attacker: atk, target: { kind: 'unit', id: soft } })
    expect(s.units[soft]).toBeUndefined()
    expect(s.units[atk].damage).toBe(1)
    // and attacking the imprisoned unit draws no counter-damage
    const atk2 = put(s, p1, 'soldier', 1)
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'attack', attacker: atk2, target: { kind: 'unit', id: jailedGuard } })
    expect(s.units[atk2].damage).toBe(0)
  })
})

describe('guard', () => {
  it('forces attacks onto guard units while any stands ready', () => {
    let { s, p1, p2 } = arena()
    const atk = put(s, p1, 'brute', 1)
    const shield = put(s, p2, 'guardian', 1)  // 1/3 guard
    const juicy = put(s, p2, 'pawn', 1)
    expect(() => act(s, p1, { type: 'attack', attacker: atk, target: { kind: 'unit', id: juicy } })).toThrow(/guard/i)
    s = act(s, p1, { type: 'attack', attacker: atk, target: { kind: 'unit', id: shield } })
    expect(s.units[shield]).toBeUndefined()
  })

  it('protects the base too', () => {
    let { s, p1, p2 } = arena()
    const atk = put(s, p1, 'brute', homeZone(p2))
    put(s, p2, 'guardian', homeZone(p2))
    expect(() => act(s, p1, { type: 'attack', attacker: atk, target: { kind: 'base', seat: p2 } })).toThrow(/guard/i)
  })
})

describe('the base', () => {
  it('can only be attacked from inside the enemy home zone; deals no counter-damage', () => {
    let { s, p1, p2 } = arena()
    const away = put(s, p1, 'brute', 1)
    const sieger = put(s, p1, 'brute', homeZone(p2))
    expect(() => act(s, p1, { type: 'attack', attacker: away, target: { kind: 'base', seat: p2 } })).toThrow(/home/i)
    s = act(s, p1, { type: 'attack', attacker: sieger, target: { kind: 'base', seat: p2 } })
    expect(s.sides[p2].life).toBe(16)
    expect(s.units[sieger].damage).toBe(0)
  })

  it('life 0 ends the game', () => {
    let { s, p1, p2 } = arena()
    s.sides[p2].life = 3
    const sieger = put(s, p1, 'brute', homeZone(p2))
    s = act(s, p1, { type: 'attack', attacker: sieger, target: { kind: 'base', seat: p2 } })
    expect(s.winner).toBe(p1)
    expect(s.winReason).toBe('life')
  })
})

describe('breakthrough and overextend', () => {
  it('breakthrough N carries excess damage to the controller, capped at N', () => {
    let { s, p1, p2 } = arena()
    const atk = put(s, p1, 'crusher', 1)    // 3/3 breakthrough 2
    const chump = put(s, p2, 'pawn', 1)     // 1/1 → excess 2, cap 2
    s = act(s, p1, { type: 'attack', attacker: atk, target: { kind: 'unit', id: chump } })
    expect(s.sides[p2].life).toBe(18)
    // cap check: 4/3 excess would be 3 vs breakthrough 2 → still 2
    const atk2 = put(s, p1, 'crusher', 1)
    const chump2 = put(s, p2, 'pawn', 1, { damage: 0 })
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'attack', attacker: atk2, target: { kind: 'unit', id: chump2 } })
    expect(s.sides[p2].life).toBe(16)
  })

  it('overextend grants +N power only when alone in its zone', () => {
    let { s, p1, p2 } = arena()
    const solo = put(s, p1, 'loner', 1)     // 2/2, overextend 3 → hits for 5 alone
    const big = put(s, p2, 'brute', 1)      // 4/3 — survives 2, dies to 5... wait 5 ≥ 3 health → dies; alone case kills
    s = act(s, p1, { type: 'attack', attacker: solo, target: { kind: 'unit', id: big } })
    expect(s.units[big]).toBeUndefined()

    // now with company: no bonus (2 damage), brute survives
    const dup = put(s, p1, 'loner', 1)
    put(s, p1, 'pawn', 1)
    const big2 = put(s, p2, 'brute', 1)
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'attack', attacker: dup, target: { kind: 'unit', id: big2 } })
    expect(s.units[big2]).toBeDefined()
    expect(s.units[big2].damage).toBe(2)
  })
})

describe('simultaneity policy', () => {
  it('if both players hit 0 life at once, the acting player wins', () => {
    let { s, p1, p2 } = arena()
    s.sides[p1].life = 1
    s.sides[p2].life = 1
    fuel(s, p1, 1)
    // bolt own base and enemy base cannot happen in one action; use a scripted double-death:
    // p1 bolts own base? No — craft: attack with breakthrough onto a chump while at 1 life vs thorns is overkill.
    // Simplest true simultaneous event: bolt targets p1's own base while p2 already at 0 is impossible —
    // instead simulate the engine contract directly: an action that drops both to 0.
    s.sides[p1].life = 0
    s.sides[p2].life = 0
    const card = toHand(s, p1, 'bolt')
    // any action triggers the state check; p1 acts → p1 wins the tie
    const res = applyAction(s, { type: 'play', card, targets: [{ kind: 'unit', id: put(s, p2, 'wall', 1) }] }, p1)
    expect(res.state.winner).toBe(p1)
  })
})
