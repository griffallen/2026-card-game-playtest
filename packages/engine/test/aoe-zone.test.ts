import { describe, it, expect } from 'vitest'
import type { CardDef, CardSet, GameState, Seat } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { validateCardSet } from '../src/validate.ts'
import { T, toyDeck, put, toHand } from './util.ts'

// ── #104/#107 phase 2, the AoE/zone group ──────────────────────────────────────────
//  • Crimson Behemoth — an on-attack, zone-scoped, friendly-fire splash whose kills (its own
//    collateral included) each pay the source 1 Influence. New engine primitive: damageFilter's
//    `creditsKills` flag (the source's onKill fires for every unit the AoE fells).
//  • Final Onslaught — the readied unit is immolated (it always dies) and Y = its remaining Health
//    pours over every OTHER unit in its zone, yours included.

const u = (slug: string, power: number, health: number, extra: Partial<CardDef> = {}): CardDef =>
  ({ slug, name: slug, color: 'red', type: 'unit', cost: 2, power, health, text: '', ...extra })

// Toy set for the primitive: a bomber that credits its collateral, and a dud that does not.
const AOE: CardSet = {
  ...T,
  bomber: u('bomber', 6, 6, {
    onAttack: [{ op: 'damageFilter', f: { side: 'all', zone: 'sameAsSelf', other: true }, n: 2, creditsKills: true }],
    onKill: [{ op: 'influence', n: 1 }],
  }),
  dudbomber: u('dudbomber', 6, 6, {   // same splash, no creditsKills — proves the flag is what pays
    onAttack: [{ op: 'damageFilter', f: { side: 'all', zone: 'sameAsSelf', other: true }, n: 2 }],
    onKill: [{ op: 'influence', n: 1 }],
  }),
}

function v3game(cards: CardSet, seed = 51): GameState {
  let s = createGame({
    seed,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: cards,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

const inf = (s: GameState, seat: Seat) => (seat === 0 ? s.influence : -s.influence)
const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

describe('damageFilter creditsKills (#107 primitive)', () => {
  it('credits the source 1 per unit its AoE fells — own collateral included — and stays zone-scoped', () => {
    const s = v3game(AOE)
    const me = s.actorSeat, them = (1 - me) as Seat
    const enemyHome = them === 0 ? 0 : 2
    const bomber = put(s, me, 'bomber', enemyHome)
    const ally = put(s, me, 'pawn', enemyHome)                        // 1/1 mine → eats 2, dies (friendly fire)
    const foe = put(s, them, 'pawn', enemyHome, { exhausted: true })  // 1/1 theirs → eats 2, dies
    const rear = put(s, me, 'pawn', 1)                                // neutral — a different zone, untouched
    s.actorSeat = me
    const before = inf(s, me)
    const next = act(s, me, { type: 'attack', attackers: [bomber], target: { kind: 'base', seat: them } })
    expect(next.units[ally]).toBeUndefined()          // own unit ate the splash
    expect(next.units[foe]).toBeUndefined()
    expect(next.units[rear]).toBeDefined()
    expect(next.units[rear].damage).toBe(0)           // zone-scoped: the neutral bystander is untouched
    expect(next.units[bomber]).toBeDefined()
    expect(next.units[bomber].damage).toBe(0)         // other:true — it never splashes itself
    expect(inf(next, me) - before).toBe(2)            // +1 per kill, its own collateral counted (#107)
  })

  it('the combat-kill path pays too, separately from the AoE (one kill = one credit)', () => {
    const s = v3game(AOE)
    const me = s.actorSeat, them = (1 - me) as Seat
    const bomber = put(s, me, 'bomber', 1)                               // neutral
    const tough = put(s, them, 'wall', 1, { exhausted: true })          // 0/5 — survives the splash 2, dies to combat
    s.actorSeat = me
    const before = inf(s, me)
    const next = act(s, me, { type: 'attack', attackers: [bomber], target: { kind: 'unit', id: tough } })
    expect(next.units[tough]).toBeUndefined()          // 2 (splash) + 6 (combat) ≥ 5
    expect(next.units[bomber]).toBeDefined()
    expect(inf(next, me) - before).toBe(1)             // ONE credit — the splash 2 wasn't lethal, combat was
  })

  it('does not choke when the splash fells the very unit it declared an attack on', () => {
    const s = v3game(AOE)
    const me = s.actorSeat, them = (1 - me) as Seat
    const bomber = put(s, me, 'bomber', 1)                       // neutral
    const mark = put(s, them, 'pawn', 1, { exhausted: true })   // 1/1 in the same zone — the declared target
    s.actorSeat = me
    const before = inf(s, me)
    const next = act(s, me, { type: 'attack', attackers: [bomber], target: { kind: 'unit', id: mark } })
    expect(next.units[mark]).toBeUndefined()   // felled by the splash at the declaration, before combat
    expect(next.units[bomber]).toBeDefined()
    expect(inf(next, me) - before).toBe(1)     // the splash-kill still credits
  })

  it('without the flag the AoE still kills but pays nothing', () => {
    const s = v3game(AOE)
    const me = s.actorSeat, them = (1 - me) as Seat
    const enemyHome = them === 0 ? 0 : 2
    const bomber = put(s, me, 'dudbomber', enemyHome)
    const foe = put(s, them, 'pawn', enemyHome, { exhausted: true })
    s.actorSeat = me
    const before = inf(s, me)
    const next = act(s, me, { type: 'attack', attackers: [bomber], target: { kind: 'base', seat: them } })
    expect(next.units[foe]).toBeUndefined()            // killed by the splash
    expect(inf(next, me) - before).toBe(0)             // but no credit — creditsKills is what pays
  })
})

// ── the real cards under the live v3 ruleset ────────────────────────────────────────
let rn = 9000
function fuelRed(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `r${rn++}`
    s.cardOf[id] = 'cinder-initiate'   // pips [red] — satisfies the presence gate + cost
    s.sides[seat].resources.push({ id, exhausted: false })
  }
}
function arena(seed = 21) {
  const s = createGame({
    seed,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: CARD_SET,
    players: [
      { name: 'Ada', deck: deckSlugs(PREBUILT_DECKS[0]) },
      { name: 'Bo', deck: deckSlugs(PREBUILT_DECKS[1]) },
    ],
  })
  const me: Seat = s.actorSeat
  const them = (1 - me) as Seat
  fuelRed(s, me, 8)
  return { s, me, them }
}

describe('Crimson Behemoth (#107) — real card', () => {
  it('compiles to the settled design: 6/6, on-attack zone splash (both sides), onKill +1', () => {
    expect(validateCardSet(CARD_SET)).toEqual([])
    expect(CARD_SET['crimson-behemoth']).toMatchObject({
      power: 6, health: 6,
      onAttack: [{ op: 'damageFilter', f: { side: 'all', zone: 'sameAsSelf', other: true }, n: 2, creditsKills: true }],
      onKill: [{ op: 'influence', n: 1 }],
    })
    expect(CARD_SET['crimson-behemoth'].onAttackBase).toBeUndefined()   // no longer base-only
  })

  it('farms Influence off its own collateral — swing into a crowded zone, cut a friendly, pocket it', () => {
    const { s, me, them } = arena()
    const enemyHome = them === 0 ? 0 : 2
    const behemoth = put(s, me, 'crimson-behemoth', enemyHome)
    const ally = put(s, me, 'cinder-initiate', enemyHome)                       // 2/1 friendly → dies to the 2
    const foe = put(s, them, 'cinder-initiate', enemyHome, { exhausted: true }) // 2/1 → dies to the 2
    const rear = put(s, me, 'cinder-initiate', 1)                               // neutral — zone-scoped, untouched
    s.actorSeat = me
    const before = inf(s, me)
    const next = act(s, me, { type: 'attack', attackers: [behemoth], target: { kind: 'base', seat: them } })
    expect(next.units[ally]).toBeUndefined()
    expect(next.units[foe]).toBeUndefined()
    expect(next.units[rear]).toBeDefined()
    expect(next.units[rear].damage).toBe(0)
    expect(next.units[behemoth].damage).toBe(0)
    expect(inf(next, me) - before).toBe(2)   // +1 friendly collateral, +1 enemy (Griff #107)
  })
})

describe('Final Onslaught (#107) — real card', () => {
  it('immolates the readied unit and blasts its remaining Health across the zone, friend and foe', () => {
    const { s, me, them } = arena()
    const home = me === 0 ? 0 : 2
    const vet = put(s, me, 'rageforged-brute', home, { exhausted: true })  // 4/4 → Y = 4
    const ally = put(s, me, 'cinder-initiate', 1)     // neutral 2/1 → eats 4, dies (friendly fire)
    const foe = put(s, them, 'cinder-initiate', 1)    // neutral 2/1 → eats 4, dies
    const onslaught = toHand(s, me, 'final-onslaught')
    s.actorSeat = me
    let next = act(s, me, { type: 'play', card: onslaught, targets: [{ kind: 'unit', id: vet }] })
    expect(next.units[vet].exhausted).toBe(false)                          // readied
    expect(next.doom).toMatchObject({ unit: vet, stage: 'waiting' })
    next.actorSeat = me
    next = act(next, me, { type: 'move', unit: vet, to: 1 })               // the extra action carries vet into the crowd
    expect(next.units[vet]).toBeUndefined()   // always dies — the sacrifice is the point
    expect(next.units[ally]).toBeUndefined()  // own unit eats Y
    expect(next.units[foe]).toBeUndefined()
    expect(next.doom).toBeNull()
  })
})
