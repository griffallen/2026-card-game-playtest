import { describe, it, expect } from 'vitest'
import type { CardDef, CardSet, GameState, Seat, TargetRef } from '../src/types.ts'
import { homeZone } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'

// #128 (Griff, ratified — amends decision 102): Breakthrough splash + chain. When a Breakthrough
// attacker's leftover breaks past a DEFEATED target, it redirects to a legal target the DEFENDER
// picks (their own unit in the zone, or their base in their Home); if that link is defeated, the
// remainder chains to the next pick — until no legal target remains or a survivor soaks the rest.
// Each link opens only on a DEFEAT; Shield/Ward end the chain; Worldrender's pierce carries down it.

const u = (slug: string, power: number, health: number, extra: Partial<CardDef> = {}): CardDef =>
  ({ slug, name: slug, color: 'red', type: 'unit', cost: 3, power, health, text: '', ...extra })

const R: CardSet = {
  ...T,
  bt3:      u('bt3', 3, 3, { kw: [{ k: 'breakthrough' }] }),        // 3-power breakthrough
  bt5:      u('bt5', 5, 3, { kw: [{ k: 'breakthrough' }] }),        // 5-power breakthrough
  pierce3:  u('pierce3', 3, 3, { kw: [{ k: 'breakthrough' }], piercesArmorShield: true }),
  frail:    u('frail', 0, 1, { kw: [{ k: 'cantAttack' }] }),        // dies to 1, power 0 → never retaliates
  soak:     u('soak', 0, 5, { kw: [{ k: 'cantAttack' }] }),         // survives the pour, ends the chain
  platewall: u('platewall', 0, 2, { kw: [{ k: 'cantAttack' }, { k: 'armor', n: 3 }] }),  // armor 3
  shell:    u('shell', 0, 2, { kw: [{ k: 'shielded' }] }),          // shielded soak
  plainatk: u('plainatk', 2, 2),                                    // NON-breakthrough attacker
}

function game(): GameState {
  let s = createGame({
    seed: 33,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: R,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

/** All defender units exhausted → no block window → a lone attacker auto-resolves straight to splash. */
const atk = (s: GameState, me: Seat, attacker: string, targetId: string) =>
  applyAction({ ...s, actorSeat: me }, { type: 'attack', attackers: [attacker], target: { kind: 'unit', id: targetId } }, me).state
const splash = (s: GameState, them: Seat, target: TargetRef) =>
  applyAction(s, { type: 'splash', target }, them).state

describe('breakthrough splash + chain (#128)', () => {
  it('splashes the leftover to a defender unit in Neutral — and a survivor ends the chain', () => {
    const s = game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const big = put(s, me, 'bt3', 1)                         // 3/3 breakthrough
    const tgt = put(s, them, 'frail', 1, { exhausted: true }) // 0/1 declared target — dies, 2 spills
    const other = put(s, them, 'soak', 1, { exhausted: true })// 0/5 in Neutral, soaks the leftover
    let a = atk(s, me, big, tgt)
    expect(a.phase).toBe('splash')                           // paused — the defender must place the 2
    expect(a.actorSeat).toBe(them)
    expect(a.units[tgt]).toBeUndefined()                     // the declared target already fell
    a = splash(a, them, { kind: 'unit', id: other })
    expect(a.phase).toBe('loop')                             // survivor soaked it — chain over
    expect(a.units[other].damage).toBe(2)                    // 3 power − 1 target health = 2 landed here
    expect(a.units[other]).toBeDefined()
  })

  it('chains through multiple kills, then dissipates when no legal target is left (Neutral)', () => {
    const s = game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const big = put(s, me, 'bt5', 1)                          // 5/3 breakthrough → 4 spills past a 0/1
    const tgt = put(s, them, 'frail', 1, { exhausted: true })
    const f2 = put(s, them, 'frail', 1, { exhausted: true })
    const f3 = put(s, them, 'frail', 1, { exhausted: true })
    let a = atk(s, me, big, tgt)                              // spill 4
    a = splash(a, them, { kind: 'unit', id: f2 })            // f2 takes 1, dies → 3 remains
    expect(a.units[f2]).toBeUndefined()
    expect(a.phase).toBe('splash')
    a = splash(a, them, { kind: 'unit', id: f3 })            // f3 takes 1, dies → 2 remains, no unit left
    expect(a.units[f3]).toBeUndefined()
    expect(a.phase).toBe('loop')                             // Neutral, no base → the last 2 dissipate
    expect(a.sides[them].life).toBe(s.sides[them].life)      // no base to reach
  })

  it('in the enemy Home, the defender may soak with a unit to SPARE the base', () => {
    const s = game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const home = homeZone(them)
    const big = put(s, me, 'bt3', home)                      // 3/3 breakthrough in the enemy Home
    const tgt = put(s, them, 'frail', home, { exhausted: true })
    const wall = put(s, them, 'soak', home, { exhausted: true })
    const life = s.sides[them].life
    let a = atk(s, me, big, tgt)
    expect(a.phase).toBe('splash')
    a = splash(a, them, { kind: 'unit', id: wall })          // choose the unit, not the base
    expect(a.units[wall].damage).toBe(2)
    expect(a.sides[them].life).toBe(life)                    // the base is spared
    expect(a.phase).toBe('loop')
  })

  it('in the enemy Home, the defender may pour straight into the base', () => {
    const s = game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const home = homeZone(them)
    const big = put(s, me, 'bt3', home)                      // spill 2
    const tgt = put(s, them, 'frail', home, { exhausted: true })
    const life = s.sides[them].life
    let a = atk(s, me, big, tgt)
    expect(a.phase).toBe('splash')                           // only the base is legal — still a choice
    a = splash(a, them, { kind: 'base', seat: them })
    expect(a.sides[them].life).toBe(life - 2)
    expect(a.phase).toBe('loop')
  })

  it('a slain unit link keeps the chain going with the base still available (enemy Home)', () => {
    const s = game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const home = homeZone(them)
    const big = put(s, me, 'bt3', home)                      // spill 2
    const tgt = put(s, them, 'frail', home, { exhausted: true })
    const chump = put(s, them, 'frail', home, { exhausted: true })
    const life = s.sides[them].life
    let a = atk(s, me, big, tgt)
    a = splash(a, them, { kind: 'unit', id: chump })         // chump soaks 1, dies → 1 remains
    expect(a.units[chump]).toBeUndefined()
    expect(a.phase).toBe('splash')                           // the base is still on offer
    a = splash(a, them, { kind: 'base', seat: them })
    expect(a.sides[them].life).toBe(life - 1)
    expect(a.phase).toBe('loop')
  })

  it('Shield ends the chain — the shielded soak takes nothing and nothing spills past it', () => {
    const s = game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const big = put(s, me, 'bt3', 1)                          // spill 2
    const tgt = put(s, them, 'frail', 1, { exhausted: true })
    const shield = put(s, them, 'shell', 1, { exhausted: true })  // 0/2 shielded
    const behind = put(s, them, 'frail', 1, { exhausted: true })
    let a = atk(s, me, big, tgt)
    a = splash(a, them, { kind: 'unit', id: shield })        // shield eats it, chain ENDS
    expect(a.units[shield].shielded).toBe(false)             // token spent
    expect(a.units[shield].damage).toBe(0)                   // took nothing
    expect(a.units[behind]).toBeDefined()                    // nothing reached the next unit
    expect(a.phase).toBe('loop')
  })

  it('Ward ends the chain too', () => {
    const s = game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const big = put(s, me, 'bt3', 1)                          // spill 2
    const tgt = put(s, them, 'frail', 1, { exhausted: true })
    const ward = put(s, them, 'frail', 1, { exhausted: true })
    s.units[ward].blockWard = true
    const behind = put(s, them, 'soak', 1, { exhausted: true })
    let a = atk(s, me, big, tgt)
    a = splash(a, them, { kind: 'unit', id: ward })
    expect(a.units[ward]).toBeDefined()                      // ward turned the whole blow aside
    expect(a.units[ward].damage).toBe(0)
    expect(a.units[ward].blockWard).toBeFalsy()
    expect(a.units[behind].damage).toBe(0)                   // chain ended — nothing spills past a ward
    expect(a.phase).toBe('loop')
  })

  it('only the breakthrough portion chains — a plain attacker never spills (enemy Home)', () => {
    const s = game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const home = homeZone(them)
    const plain = put(s, me, 'plainatk', home)               // 2/2, NO breakthrough
    const tgt = put(s, them, 'frail', home, { exhausted: true })
    const other = put(s, them, 'soak', home, { exhausted: true })
    const life = s.sides[them].life
    const a = atk(s, me, plain, tgt)                          // 2 power kills the 0/1; 1 excess is plain
    expect(a.phase).toBe('loop')                             // no breakthrough → no chain, no pause
    expect(a.units[tgt]).toBeUndefined()
    expect(a.units[other].damage).toBe(0)                    // the plain excess dissipates
    expect(a.sides[them].life).toBe(life)                    // and never reaches the base
  })

  it('Worldrender pierce carries down the chain — through armor and shield', () => {
    const s = game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const big = put(s, me, 'pierce3', 1)                     // 3/3 breakthrough + pierce → spill 2
    const tgt = put(s, them, 'frail', 1, { exhausted: true })
    const shield = put(s, them, 'shell', 1, { exhausted: true })   // 0/2 shielded
    let a = atk(s, me, big, tgt)
    // pierce ignores the shield: gross = health 2, the spilled 2 fells it exactly, chain ends
    a = splash(a, them, { kind: 'unit', id: shield })
    expect(a.units[shield]).toBeUndefined()                 // felled THROUGH the shield
    expect(a.phase).toBe('loop')
  })

  it('pierce beats a heavy-armor link and the remainder still chains on', () => {
    const s = game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const big = put(s, me, 'bt5', 1)                         // start from 4 spill…
    s.cardSet.pierce5 = { ...R.bt5, slug: 'pierce5', name: 'pierce5', piercesArmorShield: true }
    const p5 = put(s, me, 'pierce5', 1)                      // 5/3 breakthrough + pierce
    s.units[big] && delete s.units[big]                     // use only the piercer
    const tgt = put(s, them, 'frail', 1, { exhausted: true })
    const plate = put(s, them, 'platewall', 1, { exhausted: true })  // 0/2 armor 3
    const behind = put(s, them, 'frail', 1, { exhausted: true })
    let a = atk(s, me, p5, tgt)                              // spill 4, pierced
    // pierce ignores armor 3: gross = health 2, plate dies, 2 remains and chains on
    a = splash(a, them, { kind: 'unit', id: plate })
    expect(a.units[plate]).toBeUndefined()                  // armor 3 did not save it
    expect(a.phase).toBe('splash')
    a = splash(a, them, { kind: 'unit', id: behind })
    expect(a.units[behind]).toBeUndefined()                 // the pierced remainder felled it too
    expect(a.phase).toBe('loop')
  })

  it('no legal target → the leftover simply dissipates (no pause)', () => {
    const s = game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const big = put(s, me, 'bt3', 1)                         // spill 2
    const tgt = put(s, them, 'frail', 1, { exhausted: true })// the only defender unit in the zone
    const a = atk(s, me, big, tgt)
    expect(a.phase).toBe('loop')                            // nothing to redirect to → no splash window
    expect(a.units[tgt]).toBeUndefined()
  })

  it('the ATTACKER may not answer the splash, and cannot aim it at their own unit or another zone', () => {
    const s = game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const big = put(s, me, 'bt3', 1)
    const mine = put(s, me, 'soak', 1)                      // the attacker's own unit — never legal
    const elsewhere = put(s, them, 'soak', 2)               // a defender unit, but in another zone
    const tgt = put(s, them, 'frail', 1, { exhausted: true })
    const other = put(s, them, 'soak', 1, { exhausted: true })
    const a = atk(s, me, big, tgt)
    expect(a.phase).toBe('splash')
    expect(() => applyAction(a, { type: 'splash', target: { kind: 'unit', id: other } }, me))
      .toThrowError(/window/i)                              // the attacker's not in this window
    expect(() => applyAction(a, { type: 'splash', target: { kind: 'unit', id: mine } }, them))
      .toThrowError(/legal splash target/i)
    expect(() => applyAction(a, { type: 'splash', target: { kind: 'unit', id: elsewhere } }, them))
      .toThrowError(/legal splash target/i)
    // the legal-action list offers exactly the one in-zone defender unit
    expect(getLegalActions(a, them).filter(x => x.type === 'splash')).toEqual([{ type: 'splash', target: { kind: 'unit', id: other } }])
  })

  it('a blocked breakthrough attacker that kills its blocker still opens the chain', () => {
    const s = game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const big = put(s, me, 'bt3', 1)                        // 3/3 breakthrough
    const chaff = put(s, me, 'pawn', 1)                     // rider → opens the gang pairing
    const blocker = put(s, them, 'pawn', 1)                // 1/1 READY blocker (opens the window)
    const tgt = put(s, them, 'frail', 1, { exhausted: true })
    const other = put(s, them, 'soak', 1, { exhausted: true })
    let a = applyAction({ ...s, actorSeat: me }, { type: 'attack', attackers: [big, chaff], target: { kind: 'unit', id: tgt } }, me).state
    expect(a.phase).toBe('block')
    a = applyAction(a, { type: 'block', pairs: [{ blocker, onto: big }] }, them).state
    // crusher kills the 1/1 blocker (spill 2); chaff's plain 1 fills the 0/1 target; the 2 chains
    expect(a.units[blocker]).toBeUndefined()
    expect(a.phase).toBe('splash')
    a = splash(a, them, { kind: 'unit', id: other })
    expect(a.units[other].damage).toBe(2)
    expect(a.phase).toBe('loop')
  })
})
