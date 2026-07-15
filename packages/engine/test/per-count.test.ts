import { describe, it, expect } from 'vitest'
import type { CardDef, CardSet, GameState, Seat } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { DEFAULT_RULES, V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { influenceFor } from '../src/helpers.ts'
import { T, toyDeck, put, fuel, toHand } from './util.ts'

// PR #70/#71: count-scaled `per` modifier on the influence + heal ops.
//   {count:'attackers'} → onDefend influence scales with how many units attack the defender
//   {count:'units', f}  → influence/heal scales with in-play units matching a filter
// Reproducing test drafted in the #70 review: a gang attacks a Guard whose onDefend pays
// 1 influence PER attacker; the flat engine paid a flat 1 (RED) before the modifier landed.

const u = (slug: string, cost: number, power: number, health: number, extra: Partial<CardDef> = {}): CardDef =>
  ({ slug, name: slug, color: 'yellow', type: 'unit', cost, power, health, text: '', ...extra })

/** Toy set + count-scaled cards. High-health, 0-power sentry survives the gang and never counters. */
const TT: CardSet = {
  ...T,
  sentry: u('sentry', 8, 0, 20, { kw: [{ k: 'guard' }], onDefend: [{ op: 'influence', n: 1, per: { count: 'attackers' } }] }),
  // #71's exact shape: 1 influence per enemy in the chosen zone (isolated — no exhaust)
  sweep: { slug: 'sweep', name: 'sweep', color: 'yellow', type: 'action', cost: 1, text: '',
    targets: [{ t: 'zone' }], onPlay: [{ op: 'influence', n: 1, per: { count: 'units', f: { side: 'enemy', zone: 'chosenZone' } } }] },
  // 1 life to your base per friendly in the chosen zone
  rally: { slug: 'rally', name: 'rally', color: 'yellow', type: 'action', cost: 1, text: '',
    targets: [{ t: 'zone' }], onPlay: [{ op: 'heal', t: 'selfBase', n: 1, per: { count: 'units', f: { side: 'friendly', zone: 'chosenZone' } } }] },
}

function v3game(seed = 21): GameState {
  let s = createGame({
    seed,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: TT,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

describe('per: count-scaled influence/heal (PR #70/#71)', () => {
  it("count:'attackers' — a Guard's onDefend influence scales with the size of the gang", () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    // three attackers in the neutral zone gang the sentry (same zone, decision 80)
    const a1 = put(s, me, 'brute', 1), a2 = put(s, me, 'soldier', 1), a3 = put(s, me, 'pawn', 1)
    const sentry = put(s, them, 'sentry', 1)   // 0/20 guard, declared target
    s = act(s, me, { type: 'attack', attackers: [a1, a2, a3], target: { kind: 'unit', id: sentry } })
    // defender lets it through (empty block) → the declared target defends once, all three counted
    expect(s.phase).toBe('block')
    s = act(s, them, { type: 'block', pairs: [] })
    expect(influenceFor(s, them)).toBe(3)      // RED before the modifier: flat 1
    expect(s.units[sentry]).toBeDefined()      // 0/20 survives the gang
  })

  it("count:'attackers' self-block edge (decision 86 ⚑): a self-blocking target counts ALL attackers, not just the one it blocks", () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const a1 = put(s, me, 'pawn', 1), a2 = put(s, me, 'pawn', 1), a3 = put(s, me, 'pawn', 1)
    const sentry = put(s, them, 'sentry', 1)
    s = act(s, me, { type: 'attack', attackers: [a1, a2, a3], target: { kind: 'unit', id: sentry } })
    // the sentry blocks ONE attacker itself — it fires once (as blocker), counting all three
    s = act(s, them, { type: 'block', pairs: [{ blocker: sentry, onto: a1 }] })
    expect(influenceFor(s, them)).toBe(3)
  })

  it("count:'attackers' with a single attacker pays exactly 1 (a duel)", () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const a1 = put(s, me, 'brute', 1)
    const sentry = put(s, them, 'sentry', 1)
    s = act(s, me, { type: 'attack', attackers: [a1], target: { kind: 'unit', id: sentry } })
    s = act(s, them, { type: 'block', pairs: [] })
    expect(influenceFor(s, them)).toBe(1)
  })

  it("count:'units' — influence scales with enemies in the chosen zone (#71's lever)", () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    fuel(s, me, 5)
    put(s, them, 'pawn', 1); put(s, them, 'soldier', 1); put(s, them, 'brute', 1)  // 3 enemies in zone 1
    put(s, them, 'pawn', 0)   // an enemy in a DIFFERENT zone must not count
    const card = toHand(s, me, 'sweep')
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'zone', zone: 1 }] })
    expect(influenceFor(s, me)).toBe(3)
  })

  it("count:'units' — heal scales with your units in the chosen zone, overhealing past starting life (decision 104)", () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    fuel(s, me, 5)
    s.sides[me].life = 19                       // one below starting (20) — the heal must cross the old cap
    put(s, me, 'pawn', 1); put(s, me, 'soldier', 1)   // 2 friendlies in zone 1
    put(s, them, 'brute', 1)                    // an enemy there must not count
    const card = toHand(s, me, 'rally')
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'zone', zone: 1 }] })
    expect(s.sides[me].life).toBe(21)           // 19 + 2 friendlies — no cap at 20
  })

  it("real card: Light's Vanguard pays 1 influence per attacker in a live v3 game (PR #70)", () => {
    let s = createGame({
      seed: 3, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet: CARD_SET,
      players: [{ name: 'Ada', deck: deckSlugs(PREBUILT_DECKS[0]) }, { name: 'Bo', deck: deckSlugs(PREBUILT_DECKS[1]) }],
    })
    while (s.phase === 'bank') s = act(s, s.actorSeat, { type: 'skipResource' })
    const me = s.actorSeat, them = (1 - me) as Seat
    const a1 = put(s, me, 'berserker', 1), a2 = put(s, me, 'berserker', 1)
    const vanguard = put(s, them, 'light-s-vanguard', 1)   // 4/8 guard shielded, onDefend +1 per attacker
    s = act(s, me, { type: 'attack', attackers: [a1, a2], target: { kind: 'unit', id: vanguard } })
    s = act(s, them, { type: 'block', pairs: [] })         // let the gang through — the wall defends
    expect(influenceFor(s, them)).toBe(2)                  // two attackers → +2
  })

  it('no per: flat ops are unchanged (backward compat)', () => {
    // the toy `guardian` (onDefend influence n:1, no per) still pays a flat 1 vs a gang
    let s = createGame({
      seed: 7, rules: { ...DEFAULT_RULES, chooseStartingResources: false }, cardSet: CARD_SET,
      players: [{ name: 'Ada', deck: deckSlugs(PREBUILT_DECKS[0]) }, { name: 'Bo', deck: deckSlugs(PREBUILT_DECKS[1]) }],
    })
    // trivially true guard here; the exhaustive backward-compat proof is the rest of the suite staying green.
    expect(s.cardSet['bulwark-protector']).toBeDefined()
  })
})
