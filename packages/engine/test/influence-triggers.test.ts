import { describe, it, expect } from 'vitest'
import type { CardDef, CardSet, GameState, Seat } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { destroyUnit } from '../src/effects.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { validateCardSet } from '../src/validate.ts'
import { T, toyDeck, put, toHand } from './util.ts'

// ── #104/#107 — the influence-trigger cards (phase 2, group A) ─────────────────────
// Griff's one rule for every "kills/defeats" card in this batch: a trade counts as a kill —
// a unit that dies dealing a lethal blow still gets credit. Four cards, one new engine
// primitive (an onDeath `ifKilled` influence op) and three reuses of the existing onKill /
// onPlay machinery.

const u = (slug: string, power: number, health: number, extra: Partial<CardDef> = {}): CardDef =>
  ({ slug, name: slug, color: 'red', type: 'unit', cost: 2, power, health, text: '', ...extra })

// Toy set: a martyr that pays on death (+1 more if it traded) and three guards to duel it.
const P: CardSet = {
  ...T,
  pyre: u('pyre', 3, 1, { onDeath: [{ op: 'influence', n: 1 }, { op: 'influence', n: 1, ifKilled: true }] }),
  warder: u('warder', 2, 2, { kw: [{ k: 'guard' }] }),      // pyre kills it AND its counter kills pyre → trade
  bastion: u('bastion', 2, 5, { kw: [{ k: 'guard' }] }),    // survives pyre, its counter kills pyre → plain death
  pacifist: u('pacifist', 0, 2, { kw: [{ k: 'guard' }] }),  // pyre kills it, 0 counter → pyre lives
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

const inf = (s: GameState, seat: 0 | 1) => (seat === 0 ? s.influence : -s.influence)

describe('onDeath ifKilled — a trade counts as a kill (#107)', () => {
  it('a martyr that dies DEFEATING its blocker (a trade) gains the base + the kill bonus (2)', () => {
    const s = v3game(P)
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const pyre = put(s, me, 'pyre', 1)                       // 3/1, onDeath 1 (+1 if it killed)
    const target = put(s, them, 'brute', 1, { exhausted: true })
    const warder = put(s, them, 'warder', 1)                // 2/2 guard: pyre fells it, it fells pyre
    s.actorSeat = me
    const before = inf(s, me)
    let next = applyAction(s, { type: 'attack', attackers: [pyre], target: { kind: 'unit', id: target } }, me).state
    next = applyAction(next, { type: 'block', pairs: [{ blocker: warder, onto: pyre }] }, them).state
    expect(next.units[pyre]).toBeUndefined()                // pyre died
    expect(next.units[warder]).toBeUndefined()              // taking the warder with it
    expect(inf(next, me) - before).toBe(2)                  // base 1 + trade bonus 1
  })

  it('a martyr that dies WITHOUT a kill gains only the base (1)', () => {
    const s = v3game(P)
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const pyre = put(s, me, 'pyre', 1)
    const target = put(s, them, 'brute', 1, { exhausted: true })
    const bastion = put(s, them, 'bastion', 1)              // 2/5 guard: survives pyre, its counter still fells pyre
    s.actorSeat = me
    const before = inf(s, me)
    let next = applyAction(s, { type: 'attack', attackers: [pyre], target: { kind: 'unit', id: target } }, me).state
    next = applyAction(next, { type: 'block', pairs: [{ blocker: bastion, onto: pyre }] }, them).state
    expect(next.units[pyre]).toBeUndefined()                // pyre died
    expect(next.units[bastion]).toBeDefined()               // bastion stood — pyre killed nothing
    expect(inf(next, me) - before).toBe(1)                  // base only, no bonus
  })

  it('a unit that KILLS but SURVIVES gets nothing (the payout is gated on dying), and justKilled is cleared', () => {
    const s = v3game(P)
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const pyre = put(s, me, 'pyre', 1)
    const target = put(s, them, 'brute', 1, { exhausted: true })
    const pacifist = put(s, them, 'pacifist', 1)            // 0/2 guard: pyre fells it, no counter
    s.actorSeat = me
    const before = inf(s, me)
    let next = applyAction(s, { type: 'attack', attackers: [pyre], target: { kind: 'unit', id: target } }, me).state
    next = applyAction(next, { type: 'block', pairs: [{ blocker: pacifist, onto: pyre }] }, them).state
    expect(next.units[pacifist]).toBeUndefined()            // pyre killed it
    expect(next.units[pyre]).toBeDefined()                  // and lived
    expect(inf(next, me) - before).toBe(0)                  // it didn't die → onDeath never fired
    expect(next.units[pyre].justKilled).toBeFalsy()         // the flag is cleared at window advance
  })

  it('the kill flag does NOT leak: a later, unrelated death pays only the base (1)', () => {
    const s = v3game(P)
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const pyre = put(s, me, 'pyre', 1)
    const target = put(s, them, 'brute', 1, { exhausted: true })
    const pacifist = put(s, them, 'pacifist', 1)
    s.actorSeat = me
    let next = applyAction(s, { type: 'attack', attackers: [pyre], target: { kind: 'unit', id: target } }, me).state
    next = applyAction(next, { type: 'block', pairs: [{ blocker: pacifist, onto: pyre }] }, them).state
    expect(next.units[pyre]).toBeDefined()                  // pyre killed pacifist earlier and survived
    const before = inf(next, me)
    destroyUnit(next, next.units[pyre], 'destroyed')        // now it dies to something unrelated
    expect(inf(next, me) - before).toBe(1)                  // base only — the old kill did NOT carry over
  })
})

// ── the four real cards under the live v3 ruleset ──────────────────────────────────
const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state
let rn = 7000
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

describe('the four real influence-trigger cards (#104/#107)', () => {
  it('compiles to the settled design; the whole card set still validates', () => {
    expect(validateCardSet(CARD_SET)).toEqual([])
    expect(CARD_SET['flameblade-raider']).toMatchObject({
      power: 4, health: 1,
      onDeath: [{ op: 'influence', n: 1 }, { op: 'influence', n: 1, ifKilled: true }],
    })
    expect(CARD_SET['flameblade-raider'].kw?.map(k => k.k).sort()).toEqual(['breakthrough', 'rush'])
    expect(CARD_SET['burning-oath']).toMatchObject({
      type: 'upgrade',
      onPlay: [{ op: 'influence', n: 1 }],
      onKill: [{ op: 'influence', n: 1 }],
    })
    expect(CARD_SET['burning-oath'].statics).toContainEqual({ s: 'aura', scope: 'attached', p: 2 })
    expect(CARD_SET['high-justiciar']).toMatchObject({ power: 1, health: 4, onKill: [{ op: 'influence', n: 1 }] })
    expect(CARD_SET['high-justiciar'].kw?.map(k => k.k)).toEqual(['guard'])
    expect(CARD_SET['high-justiciar'].onDefend).toBeUndefined()   // the old defend payout is gone
    expect(CARD_SET['exemplar-knight']).toMatchObject({ power: 4, health: 4, onKill: [{ op: 'influence', n: 1 }] })
    expect(CARD_SET['exemplar-knight'].onAttack).toBeUndefined()  // the old +2 self-buff is gone
  })

  it('Flameblade Raider: dies defeating its target (a trade) → +2 Influence', () => {
    const { s, me, them } = arena()
    const raider = put(s, me, 'flameblade-raider', 1)          // 4/1
    const victim = put(s, them, 'cinder-initiate', 1, { exhausted: true })  // 2/1 — dies to 4, hits back for 2
    s.actorSeat = me
    const before = inf(s, me)
    const next = act(s, me, { type: 'attack', attackers: [raider], target: { kind: 'unit', id: victim } })
    expect(next.units[raider]).toBeUndefined()                // the raider fell
    expect(next.units[victim]).toBeUndefined()                // dealing the lethal blow — a trade
    expect(inf(next, me) - before).toBe(2)                    // 1 death + 1 trade bonus
  })

  it('Exemplar Knight: defeats a unit and lives → +1 Influence', () => {
    const { s, me, them } = arena()
    const knight = put(s, me, 'exemplar-knight', 1)           // 4/4
    const victim = put(s, them, 'cinder-initiate', 1, { exhausted: true })
    s.actorSeat = me
    const before = inf(s, me)
    const next = act(s, me, { type: 'attack', attackers: [knight], target: { kind: 'unit', id: victim } })
    expect(next.units[victim]).toBeUndefined()                // killed
    expect(next.units[knight]).toBeDefined()                  // survived the 2 counter
    expect(inf(next, me) - before).toBe(1)
  })

  it('High Justiciar: keeps Guard and pays 1 when it defeats a unit', () => {
    const { s, me, them } = arena()
    const just = put(s, me, 'high-justiciar', 1)              // 1/4 guard
    const victim = put(s, them, 'cinder-initiate', 1, { exhausted: true })  // 1 health — dies to power 1
    s.actorSeat = me
    const before = inf(s, me)
    const next = act(s, me, { type: 'attack', attackers: [just], target: { kind: 'unit', id: victim } })
    expect(next.units[victim]).toBeUndefined()                // defeated
    expect(next.units[just]).toBeDefined()                    // 4 health outlasts the 2 counter
    expect(inf(next, me) - before).toBe(1)
  })

  it('Burning Oath: +1 when it attaches, then +1 each time its bearer defeats a unit', () => {
    const { s, me, them } = arena()
    const carrier = put(s, me, 'rageforged-brute', 1)         // 4/4, red — a clean bearer
    fuelRed(s, me, 0)
    const oath = toHand(s, me, 'burning-oath')
    const attachBefore = inf(s, me)
    let next = act(s, me, { type: 'play', card: oath, targets: [{ kind: 'unit', id: carrier }] })
    next.actorSeat = me                                       // fixtures drive one seat; ignore the window flip
    expect(next.upgrades[oath].attachedTo).toBe(carrier)
    expect(inf(next, me) - attachBefore).toBe(1)              // the on-attach gain

    const victim = put(next, them, 'cinder-initiate', 1, { exhausted: true })
    const killBefore = inf(next, me)
    next = act(next, me, { type: 'attack', attackers: [carrier], target: { kind: 'unit', id: victim } })
    expect(next.units[victim]).toBeUndefined()                // the oath-bearer (6 power) fells it
    expect(next.units[carrier]).toBeDefined()                 // and lives
    expect(inf(next, me) - killBefore).toBe(1)                // the per-kill gain rides through the upgrade
  })
})
