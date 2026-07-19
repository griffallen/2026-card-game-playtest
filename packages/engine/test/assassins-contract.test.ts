import { describe, expect, it } from 'vitest'
import type { CardDef, CardSet, GameState, Seat } from '../src/types.ts'
import { homeZone } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { validateCardSet } from '../src/validate.ts'
import { effHealth, influenceFor } from '../src/helpers.ts'
import { T, toyDeck, put, toHand, fuel, toLoop } from './util.ts'

// ── #122 Assassin's Contract — upgrade → ACTION rework ────────────────────────
// "Destroy target unit. You lose Life equal to its remaining Health, and its owner
//  gains Influence equal to half its printed cost, rounded up."
//  Targets ANY unit (side 'any'). Three effects, ordered [lose-life, influence-to-owner,
//  destroy] so the destroy runs LAST while the earlier ops read the LIVE target:
//   1. destroy the target unit
//   2. the CASTER loses Life = target's remaining Health (effHealth − damage, NOT printed)
//   3. the target's OWNER gains ceil(printed cost / 2) — X-cost → 0. The "owner", not the
//      controller: kill an ENEMY unit and the ENEMY's Influence rises (the deliberate twist).
//  New primitives: PerCounts targetRemainingHealth + targetCostHalf; the influenceOwner op.

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

/** Toy unit at a controlled printed cost — the cost drives the owner's Influence payout. */
const tu = (slug: string, cost: number, power: number, health: number, extra: Partial<CardDef> = {}): CardDef =>
  ({ slug, name: slug, color: 'purple', type: 'unit', cost, power, health, text: '', ...extra })

const TT: CardSet = {
  ...T,
  mark7: tu('mark7', 7, 2, 5),
  mark1: tu('mark1', 1, 1, 3),
  mark2: tu('mark2', 2, 2, 4),
  markx: tu('markx', 0, 2, 3, { xCost: true }),   // an X-cost target counts as cost 0
  // toy Assassin's Contract — cost 1, no pips (so tests skip pip plumbing), same ops as the real card
  contract: {
    slug: 'contract', name: 'contract', color: 'purple', type: 'action', cost: 1, text: '',
    targets: [{ t: 'unit', side: 'any' }],
    onPlay: [
      { op: 'damage', t: 'selfBase', n: 1, per: { count: 'targetRemainingHealth' } },
      { op: 'influenceOwner', t: 'chosen0', n: 1, per: { count: 'targetCostHalf' } },
      { op: 'destroy', t: 'chosen0' },
    ],
  },
}

function v3game(seed = 21): GameState {
  let s = createGame({
    seed, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet: TT,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

// ── real-card arena: real decks under the v3 ruleset, with purple-pip fuel ─────
let rn = 6000
/** Ready resources banked as Glimpse (pips [purple]) — satisfies cost AND the purple pip gate. */
function fuelPurple(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `p${rn++}`
    s.cardOf[id] = 'glimpse'
    s.sides[seat].resources.push({ id, exhausted: false })
  }
}
function arena(seed = 21) {
  let s = createGame({
    seed, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet: CARD_SET,
    players: [
      { name: 'Ada', deck: deckSlugs(PREBUILT_DECKS[0]) },
      { name: 'Bo', deck: deckSlugs(PREBUILT_DECKS[1]) },
    ],
  })
  s = toLoop(s)
  const me = s.actorSeat
  const them = (1 - me) as Seat
  fuelPurple(s, me, 8)
  fuelPurple(s, them, 8)
  return { s, me, them }
}

describe("Assassin's Contract (#122): destroy any unit; caster pays its remaining Health; its OWNER is paid", () => {
  it('destroys an ENEMY unit: the ENEMY (owner) gains ceil(cost/2), the caster loses remaining Health (not printed)', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const mark = put(s, them, 'mark7', homeZone(them), { damage: 2 })   // health 5, chipped 2 → remaining 3
    const c = toHand(s, me, 'contract'); fuel(s, me, 1)
    const life0 = s.sides[me].life
    const infThem0 = influenceFor(s, them)
    s = act(s, me, { type: 'play', card: c, targets: [{ kind: 'unit', id: mark }] })
    expect(s.units[mark]).toBeUndefined()                 // destroyed
    expect(influenceFor(s, them)).toBe(infThem0 + 4)      // the enemy owner gains ceil(7/2)=4 — the twist
    expect(s.sides[me].life).toBe(life0 - 3)              // remaining Health 3 (5 − 2 damage), NOT printed 5
  })

  it('destroys your OWN unit: YOU (the owner) gain the Influence, and you still pay the Life', () => {
    let s = v3game()
    const me = s.actorSeat
    const mine = put(s, me, 'mark2', homeZone(me))        // cost 2 → ceil=1; health 4, full
    const c = toHand(s, me, 'contract'); fuel(s, me, 1)
    const life0 = s.sides[me].life
    const infMe0 = influenceFor(s, me)
    s = act(s, me, { type: 'play', card: c, targets: [{ kind: 'unit', id: mine }] })
    expect(s.units[mine]).toBeUndefined()
    expect(influenceFor(s, me)).toBe(infMe0 + 1)          // you own it → you gain
    expect(s.sides[me].life).toBe(life0 - 4)              // full remaining Health
  })

  it('owner Influence = ceil(printed cost / 2): 7 → 4, 1 → 1, 2 → 1', () => {
    for (const [slug, want] of [['mark7', 4], ['mark1', 1], ['mark2', 1]] as const) {
      let s = v3game()
      const me = s.actorSeat, them = (1 - me) as Seat
      const mark = put(s, them, slug, homeZone(them))
      const c = toHand(s, me, 'contract'); fuel(s, me, 1)
      const infThem0 = influenceFor(s, them)
      s = act(s, me, { type: 'play', card: c, targets: [{ kind: 'unit', id: mark }] })
      expect(influenceFor(s, them) - infThem0).toBe(want)
    }
  })

  it('Life paid = remaining Health: a full-health target costs more Life than a chipped one', () => {
    let s1 = v3game()
    const me1 = s1.actorSeat, them1 = (1 - me1) as Seat
    const full = put(s1, them1, 'mark7', homeZone(them1))            // damage 0 → remaining 5
    const c1 = toHand(s1, me1, 'contract'); fuel(s1, me1, 1)
    const l0a = s1.sides[me1].life
    s1 = act(s1, me1, { type: 'play', card: c1, targets: [{ kind: 'unit', id: full }] })
    const paidFull = l0a - s1.sides[me1].life

    let s2 = v3game()
    const me2 = s2.actorSeat, them2 = (1 - me2) as Seat
    const chip = put(s2, them2, 'mark7', homeZone(them2), { damage: 4 })   // remaining 1
    const c2 = toHand(s2, me2, 'contract'); fuel(s2, me2, 1)
    const l0b = s2.sides[me2].life
    s2 = act(s2, me2, { type: 'play', card: c2, targets: [{ kind: 'unit', id: chip }] })
    const paidChip = l0b - s2.sides[me2].life

    expect(paidFull).toBe(5)
    expect(paidChip).toBe(1)
    expect(paidFull).toBeGreaterThan(paidChip)
  })

  it('an X-cost target grants 0 Influence (X counts as cost 0), yet is still destroyed and still costs Life', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const x = put(s, them, 'markx', homeZone(them))       // xCost, health 3
    const c = toHand(s, me, 'contract'); fuel(s, me, 1)
    const life0 = s.sides[me].life
    const infThem0 = influenceFor(s, them)
    s = act(s, me, { type: 'play', card: c, targets: [{ kind: 'unit', id: x }] })
    expect(s.units[x]).toBeUndefined()
    expect(influenceFor(s, them)).toBe(infThem0)          // 0 Influence for an X-cost target
    expect(s.sides[me].life).toBe(life0 - 3)              // still pays remaining Health
  })

  it('resolution order: destroy runs AFTER the reads — both the Life price and the owner payout see the LIVE target', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const mark = put(s, them, 'mark2', homeZone(them))    // cost 2, health 4
    const c = toHand(s, me, 'contract'); fuel(s, me, 1)
    const life0 = s.sides[me].life
    const infThem0 = influenceFor(s, them)
    s = act(s, me, { type: 'play', card: c, targets: [{ kind: 'unit', id: mark }] })
    // had destroy run first, both reads would be 0 — they aren't
    expect(s.sides[me].life).toBe(life0 - 4)
    expect(influenceFor(s, them)).toBe(infThem0 + 1)
    expect(s.units[mark]).toBeUndefined()
  })

  // ── the real card, compiled from data/cards/purple/assassin-s-contract.md ──
  it('the real card compiles to the locked shape and the whole set stays valid', () => {
    const def = CARD_SET['assassin-s-contract']
    expect(def.type).toBe('action')
    expect(def.cost).toBe(4)
    expect(def.pips).toEqual(['purple'])
    expect(def.targets).toEqual([{ t: 'unit', side: 'any' }])
    expect(def.onPlay).toEqual([
      { op: 'damage', t: 'selfBase', n: 1, per: { count: 'targetRemainingHealth' } },
      { op: 'influenceOwner', t: 'chosen0', n: 1, per: { count: 'targetCostHalf' } },
      { op: 'destroy', t: 'chosen0' },
    ])
    // the old upgrade machinery is gone
    expect(def.statics).toBeUndefined()
    expect(def.attach).toBeUndefined()
    expect(def.onKill).toBeUndefined()
    expect(validateCardSet(CARD_SET)).toEqual([])
  })

  it('plays end-to-end via the real card + purple pip gate: destroys a real enemy unit, pays remaining Health, pays the enemy owner', () => {
    let { s, me, them } = arena()
    const target = put(s, them, 'worldrender', 1, { damage: 1 })   // real unit; read its cost/health live
    const def = CARD_SET['worldrender']
    const remaining = effHealth(s, s.units[target]) - s.units[target].damage
    const owed = Math.ceil(def.cost / 2)
    const c = toHand(s, me, 'assassin-s-contract')
    const life0 = s.sides[me].life
    const infThem0 = influenceFor(s, them)
    s = act(s, me, { type: 'play', card: c, targets: [{ kind: 'unit', id: target }] })
    expect(s.units[target]).toBeUndefined()
    expect(s.sides[me].life).toBe(life0 - remaining)
    expect(influenceFor(s, them)).toBe(infThem0 + owed)
  })
})
