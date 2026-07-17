import { describe, it, expect } from 'vitest'
import type { CardDef, CardSet, GameState, Seat } from '../src/types.ts'
import { homeZone } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { T, toyDeck, put } from './util.ts'

// #107 (Worldrender): whenever this unit deals COMBAT damage to an enemy unit, that enemy's Shield and
//   Armor are ignored — its full Power lands, and the shield token is NOT consumed (it does not strip
//   the enemy's keywords, so other attackers still meet the shield/armor). This exercises the new
//   `piercesArmorShield` flag threaded through the blockerPairing combat resolver's damage path.

const u = (slug: string, cost: number, power: number, health: number, extra: Partial<CardDef> = {}): CardDef =>
  ({ slug, name: slug, color: 'red', type: 'unit', cost, power, health, text: '', ...extra })

const TT: CardSet = {
  ...T,
  render: u('render', 8, 4, 8, { kw: [{ k: 'rush' }, { k: 'breakthrough' }, { k: 'scar' }], piercesArmorShield: true }),
  bulwark: u('bulwark', 3, 2, 20, { kw: [{ k: 'armor', n: 2 }] }),   // armor 2, roomy health to measure
  aegis: u('aegis', 3, 2, 20, { kw: [{ k: 'shielded' }] }),          // shielded, roomy health
  plainatk: u('plainatk', 4, 4, 8),                                  // 4 power, no pierce (armor control)
  smallatk: u('smallatk', 2, 2, 8),                                  // 2 power, no pierce (shield control)
  wall2: u('wall2', 3, 0, 3, { kw: [{ k: 'armor', n: 2 }] }),        // armor 2, health 3 — the siege defender
}

function v3game(seed = 21, cardSet: CardSet = TT): GameState {
  let s = createGame({
    seed, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}
const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

describe('Worldrender — combat pierce (ignores enemy Shield + Armor) (#107)', () => {
  it("its full Power lands through the enemy's Armor — 4 hits for 4, not 2", () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const atk = put(s, me, 'render', 1)     // 4/8, pierces
    const def = put(s, them, 'bulwark', 1)  // armor 2, health 20
    s = act(s, me, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: def } })
    expect(s.units[def].damage).toBe(4)     // armor ignored (a normal 4-power hit would land 2)
  })

  it('a normal (non-piercing) attacker is still blunted by the same Armor — others are unaffected', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const atk = put(s, me, 'plainatk', 1)   // 4 power, no pierce
    const def = put(s, them, 'bulwark', 1)  // armor 2
    s = act(s, me, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: def } })
    expect(s.units[def].damage).toBe(2)     // 4 - armor 2 — Armor works normally for everyone else
  })

  it("its full Power lands through the enemy's Shield, and the shield is NOT consumed", () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const atk = put(s, me, 'render', 1)     // 4/8, pierces
    const def = put(s, them, 'aegis', 1)    // shielded, health 20
    expect(s.units[def].shielded).toBe(true)
    s = act(s, me, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: def } })
    expect(s.units[def].damage).toBe(4)         // full damage lands
    expect(s.units[def].shielded).toBe(true)    // the token survives — it did not remove the keyword
  })

  it('a normal attacker still gets its first hit eaten by the same Shield — others are unaffected', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const atk = put(s, me, 'smallatk', 1)   // 2 power, no pierce
    const def = put(s, them, 'aegis', 1)    // shielded
    s = act(s, me, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: def } })
    expect(s.units[def].damage).toBe(0)         // absorbed
    expect(s.units[def].shielded).toBe(false)   // the shield spent as normal
  })

  it('as the defender, Worldrender strikes back through its attacker\'s Armor too', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const atk = put(s, me, 'bulwark', 1)    // armor 2, power 2, health 20 — the attacker
    const render = put(s, them, 'render', 1)  // 4/8, pierces, the target
    s = act(s, me, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: render } })
    expect(s.units[atk].damage).toBe(4)     // Worldrender's 4-power counter ignores the attacker's armor 2
    expect(s.units[render].damage).toBe(2)  // it took the attacker's 2 (Worldrender has no armor of its own)
  })

  it('breakthrough + pierce: besieging the Home, the overkill spills to the base off raw Health', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const zone = homeZone(them)
    const atk = put(s, me, 'render', zone)   // 4 power, breakthrough + pierce, standing in the enemy Home
    const def = put(s, them, 'wall2', zone)  // armor 2, health 3, power 0
    const baseBefore = s.sides[them].life
    s = act(s, me, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: def } })
    expect(s.units[def]).toBeUndefined()             // 4 pierces armor 2 and fells the 3-health wall
    expect(s.sides[them].life).toBe(baseBefore - 1)  // 1 breakthrough excess past raw Health spills to the base
  })

  it('real card is wired: 4/8, rush + breakthrough + scar, piercesArmorShield', () => {
    const def = CARD_SET['worldrender']
    expect(def.power).toBe(4)
    expect(def.health).toBe(8)
    expect((def.kw ?? []).map(k => k.k).sort()).toEqual(['breakthrough', 'rush', 'scar'])
    expect(def.piercesArmorShield).toBe(true)
  })

  it('real card in a live v3 game pierces a real armored defender', () => {
    let s = createGame({
      seed: 4, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet: CARD_SET,
      players: [{ name: 'Ada', deck: deckSlugs(PREBUILT_DECKS[0]) }, { name: 'Bo', deck: deckSlugs(PREBUILT_DECKS[1]) }],
    })
    while (s.phase === 'bank') s = act(s, s.actorSeat, { type: 'skipResource' })
    const me = s.actorSeat, them = (1 - me) as Seat
    const render = put(s, me, 'worldrender', 1)             // real 4/8 pierce
    const def = put(s, them, 'gateward-colossus', 1)        // real 2/4, armor 1 (a Guard)
    s = act(s, me, { type: 'attack', attackers: [render], target: { kind: 'unit', id: def } })
    if (s.phase === 'block') s = act(s, them, { type: 'block', pairs: [] })   // let it through
    expect(s.units[def]).toBeUndefined()   // 4 through armor 1 fells the 4-health colossus (a normal hit lands 3)
  })

  it('real card in a live v3 game pierces a real shielded defender without spending its shield', () => {
    let s = createGame({
      seed: 7, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet: CARD_SET,
      players: [{ name: 'Ada', deck: deckSlugs(PREBUILT_DECKS[0]) }, { name: 'Bo', deck: deckSlugs(PREBUILT_DECKS[1]) }],
    })
    while (s.phase === 'bank') s = act(s, s.actorSeat, { type: 'skipResource' })
    const me = s.actorSeat, them = (1 - me) as Seat
    const render = put(s, me, 'worldrender', 1)          // real 4/8 pierce
    const def = put(s, them, 'light-s-vanguard', 1)      // real 4/8 shielded
    s = act(s, me, { type: 'attack', attackers: [render], target: { kind: 'unit', id: def } })
    if (s.phase === 'block') s = act(s, them, { type: 'block', pairs: [] })   // let it through
    expect(s.units[def].damage).toBe(4)        // full 4 lands through the shield
    expect(s.units[def].shielded).toBe(true)   // the shield token is untouched
  })
})
