import { describe, it, expect } from 'vitest'
import type { CardDef, CardSet, GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'

// #84 (Griff, ratified 2026-07-15 — option A, amends decision 84): a gang's declared target no
// longer strikes EVERY unblocked attacker at full power. Its retaliation is now DIVIDED — poured
// across the unblocked attackers, highest effective power first (defender may name the order),
// each taking up to what fells it through armor, the remainder spilling to the next, until the
// pool is spent. A lone attacker still soaks the whole pool. The target never strikes itself.

const u = (slug: string, power: number, health: number, extra: Partial<CardDef> = {}): CardDef =>
  ({ slug, name: slug, color: 'red', type: 'unit', cost: 3, power, health, text: '', ...extra })

const R: CardSet = {
  ...T,
  bigwall:  u('bigwall', 5, 9, { kw: [{ k: 'cantAttack' }] }),  // power-5 target, fat enough to survive the gang
  titan:    u('titan', 4, 12, { kw: [{ k: 'cantAttack' }] }),   // power-4 target
  hardwall: u('hardwall', 5, 12, { kw: [{ k: 'cantAttack' }] }),// power-5 target for the armor pour
  champ:    u('champ', 3, 9, { kw: [{ k: 'cantAttack' }] }),    // power-3 target — pool reaches only the biggest
  shieldy:  u('shieldy', 2, 2, { kw: [{ k: 'shielded' }] }),    // shielded attacker
}

function game(retaliation: 'ready' | 'always' = 'always'): GameState {
  let s = createGame({
    seed: 41,
    rules: { ...V3_RULES, retaliation, chooseStartingResources: false },
    cardSet: R,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

/** Declare a gang attack on `target`, then answer the block window (default: decline). */
function gang(s: GameState, me: 0 | 1, attackers: string[], target: string, block?: { pairs?: { blocker: string; onto: string }[]; retaliationOrder?: string[] }): GameState {
  const them = (1 - me) as 0 | 1
  s.actorSeat = me
  let next = applyAction(s, { type: 'attack', attackers, target: { kind: 'unit', id: target } }, me).state
  if (next.phase === 'block') next = applyAction(next, { type: 'block', pairs: block?.pairs ?? [], retaliationOrder: block?.retaliationOrder }, them).state
  return next
}

describe('divided gang retaliation (#84, option A)', () => {
  it('pours the strike-back across the gang — fells the front of the line, wounds the last', () => {
    const s = game('always')
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const r1 = put(s, me, 'soldier', 1)          // 2/2  (created first → lowest instance id)
    const r2 = put(s, me, 'soldier', 1)          // 2/2
    const r3 = put(s, me, 'soldier', 1)          // 2/2
    const wall = put(s, them, 'bigwall', 1)      // 5/9 declared target
    const after = gang(s, me, [r1, r2, r3], wall)
    // pool 5: r1 eats 2 (dies), r2 eats 2 (dies), r3 gets the last 1 (wounded, survives).
    // Under the OLD 'always' rule all three took 5 and all three died — the nerf.
    expect(after.units[r1]).toBeUndefined()
    expect(after.units[r2]).toBeUndefined()
    expect(after.units[r3].damage).toBe(1)
    expect(after.units[wall].damage).toBe(6)     // 2+2+2 landed; the wall lives on 9 health
  })

  it('a pool big enough spills clean through the whole gang', () => {
    const s = game('always')
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const pawn = put(s, me, 'pawn', 1)           // 1/1
    const brute = put(s, me, 'brute', 1)         // 4/3
    const target = put(s, them, 'titan', 1)      // 4/12
    const after = gang(s, me, [pawn, brute], target)
    // pool 4: the brute (highest power) falls to 3, the leftover 1 finishes the pawn — both gone
    expect(after.units[brute]).toBeUndefined()
    expect(after.units[pawn]).toBeUndefined()
  })

  it('default spares what the pool cannot reach — power beats id-order', () => {
    const s = game('always')
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const pawn = put(s, me, 'pawn', 1)           // 1/1 played first (lowest id)
    const brute = put(s, me, 'brute', 1)         // 4/3 the bigger body
    const target = put(s, them, 'champ', 1)      // 3/9 — only 3 power to spend
    const after = gang(s, me, [pawn, brute], target)
    // highest power first: the whole pool of 3 falls on the brute (gross 3) and fells it; nothing
    // is left for the pawn. Id-order would have wasted 1 on the pawn and left the brute standing.
    expect(after.units[brute]).toBeUndefined()
    expect(after.units[pawn].damage).toBe(0)
  })

  it('the defender may name the order — redirecting the strike-back off the big body', () => {
    const s = game('always')
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const soldier = put(s, me, 'soldier', 1)     // 2/2
    const brute = put(s, me, 'brute', 1)         // 4/3
    const target = put(s, them, 'titan', 1)      // 4/12
    // aim the 4 power at the soldier first: soldier (gross 2) dies, the 2 left over only wounds the brute
    const after = gang(s, me, [soldier, brute], target, { retaliationOrder: [soldier, brute] })
    expect(after.units[soldier]).toBeUndefined() // felled first by the defender's aim
    expect(after.units[brute].damage).toBe(2)    // wounded, survives on 3 health — default would have killed it
  })

  it('rejects an order that names a non-attacker or repeats an id', () => {
    const s = game('always')
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const r1 = put(s, me, 'soldier', 1)
    const r2 = put(s, me, 'soldier', 1)
    const bystander = put(s, me, 'pawn', 2)      // not in this combat
    const target = put(s, them, 'titan', 1)
    s.actorSeat = me
    const decl = applyAction(s, { type: 'attack', attackers: [r1, r2], target: { kind: 'unit', id: target } }, me).state
    expect(decl.phase).toBe('block')
    expect(() => applyAction(decl, { type: 'block', pairs: [], retaliationOrder: [r1, bystander] }, them))
      .toThrowError(/retaliation order/i)
    expect(() => applyAction(decl, { type: 'block', pairs: [], retaliationOrder: [r1, r1] }, them))
      .toThrowError(/retaliation order/i)
  })

  it('a lone attacker still soaks the whole retaliation (single-target unchanged)', () => {
    const s = game('always')
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const raider = put(s, me, 'soldier', 1)      // 2/2
    const target = put(s, them, 'brute', 1, { exhausted: true })  // 4/3 — no ready guard, so no block window
    s.actorSeat = me
    const after = applyAction(s, { type: 'attack', attackers: [raider], target: { kind: 'unit', id: target } }, me).state
    expect(after.phase).toBe('loop')             // duel law: lone attacker, no guard → resolves at once
    expect(after.units[raider]).toBeUndefined()  // the target's full 4 fells the lone raider
    expect(after.units[target].damage).toBe(2)
  })

  it('retaliation fells through armor — the pour pays the armor tax out of the pool', () => {
    const s = game('always')
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const plated = put(s, me, 'plated', 1)       // 2/3 armor 2 (created first → poured first on the power-2 tie)
    const soldier = put(s, me, 'soldier', 1)     // 2/2
    const target = put(s, them, 'hardwall', 1)   // 5/12
    const after = gang(s, me, [plated, soldier], target)
    // plated gross = 3 health + 2 armor = 5 → the whole pool of 5 is spent felling it (dealt 5-2=3=health)
    expect(after.units[plated]).toBeUndefined()  // armor delayed but did not save it
    expect(after.units[soldier].damage).toBe(0)  // pool exhausted — the soldier is untouched
  })

  it('a shield on an unblocked attacker eats its chunk and drains the pool', () => {
    const s = game('always')
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const shieldy = put(s, me, 'shieldy', 1)     // 2/2 shielded (created first → poured first)
    const soldier = put(s, me, 'soldier', 1)     // 2/2
    const titan = put(s, them, 'titan', 1)       // 4/12 — survives the gang, retaliates for 4
    const after = gang(s, me, [shieldy, soldier], titan)
    // pool 4: shieldy's chunk (gross 2) is fully absorbed by the shield — 0 damage, shield spent,
    // but 2 is still drained from the pool; the soldier then eats the remaining 2 and dies.
    expect(after.units[shieldy].shielded).toBe(false)  // shield popped
    expect(after.units[shieldy].damage).toBe(0)        // took no damage
    expect(after.units[soldier]).toBeUndefined()       // the leftover 2 felled the 2/2
  })

  it("'ready': a ready target divides its strike; an exhausted target strikes no one", () => {
    // ready target → retaliates, divided
    const s1 = game('ready')
    const me1 = s1.actorSeat, them1 = (1 - me1) as 0 | 1
    const a1 = put(s1, me1, 'soldier', 1)        // 2/2
    const a2 = put(s1, me1, 'soldier', 1)        // 2/2
    const ready = put(s1, them1, 'bigwall', 1)   // 5/9 ready
    const r1 = gang(s1, me1, [a1, a2], ready)
    expect(r1.units[a1]).toBeUndefined()         // pool 5 fells both 2/2s (2+2)
    expect(r1.units[a2]).toBeUndefined()

    // exhausted target under 'ready' → no strike-back at all
    const s2 = game('ready')
    const me2 = s2.actorSeat, them2 = (1 - me2) as 0 | 1
    const b1 = put(s2, me2, 'soldier', 1)
    const b2 = put(s2, me2, 'soldier', 1)
    const sleepy = put(s2, them2, 'bigwall', 1, { exhausted: true })
    const r2 = gang(s2, me2, [b1, b2], sleepy)
    expect(r2.units[b1].damage).toBe(0)          // caught exhausted: no retaliation
    expect(r2.units[b2].damage).toBe(0)
  })
})
