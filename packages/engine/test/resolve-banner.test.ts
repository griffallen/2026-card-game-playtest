import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { createGame } from '../src/setup.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { getLegalActions } from '../src/legal.ts'
import { validateCardSet } from '../src/validate.ts'
import { destroyUnit } from '../src/effects.ts'
import { effArmor, effHealth, effPower } from '../src/helpers.ts'
import type { GameState, Seat } from '../src/types.ts'
import { put, toHand } from './util.ts'

// ── #86 Resolve Banner — attached +Health/+Armor, +Power aura, free friendly salvage,
//    and the game's first mid-game re-attachment (pass-as-action) ───────────────────
// A 4-cost yellow upgrade (pips yellow, yellow). Attach to a friendly unit: that unit
// gains +1 Health and +1 Armor; OTHER friendly units in its zone get +1 Power. When it
// orphans, only a friendly unit may salvage it — for 0 (an opponent can't touch it). And
// it can be PASSED to another friendly unit in the same zone for 2 resources, as an action,
// any number of times.

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state
const ready = (s: GameState, seat: Seat) => s.sides[seat].resources.filter(r => !r.exhausted).length

let n = 6000
/** Ready resources with a real yellow-pip slug — satisfies both cost and the v3 pip gate. */
function fuelYellow(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `y${n++}`
    s.cardOf[id] = 'iron-discipline'   // Iron Plating: pips [yellow]
    s.sides[seat].resources.push({ id, exhausted: false })
  }
}

/** Real-cards game under the LIVE v3 ruleset (presence pips, orphaning upgrades). */
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
  // round-1 v3 opens straight in the loop; seat 0 acts first (createGame sets initiative 0)
  const me: Seat = s.actorSeat
  const them = (1 - me) as Seat
  fuelYellow(s, me, 8)
  fuelYellow(s, them, 8)
  return { s, me, them }
}

/** Play the banner from hand onto `carrier`. */
function attachBanner(s: GameState, seat: Seat, carrier: string): { s: GameState; banner: string } {
  const banner = toHand(s, seat, 'resolve-banner')
  s = act(s, seat, { type: 'play', card: banner, targets: [{ kind: 'unit', id: carrier }] })
  s.actorSeat = seat   // fixtures drive one seat; ignore the window flip
  return { s, banner }
}

describe('Resolve Banner (#86): +Health/+Armor carrier, +Power aura, free salvage, pass-as-action', () => {
  it('compiles to the locked design: upgrade, cost 4, two yellow pips, the two auras + pass/salvage config', () => {
    const def = CARD_SET['resolve-banner']
    expect(def.type).toBe('upgrade')
    expect(def.cost).toBe(4)
    expect(def.pips).toEqual(['yellow', 'yellow'])
    expect(def.statics).toContainEqual({ s: 'aura', scope: 'friendlyInZone', p: 1 })
    expect(def.statics).toContainEqual({ s: 'aura', scope: 'attached', h: 1, armor: 1 })
    expect(def.attach).toEqual({ side: 'friendly', pass: 2, salvage: 'freeFriendly' })
    expect(validateCardSet(CARD_SET)).toEqual([])
  })

  it('carrier gains +1 Health and +1 Armor; OTHER friendly units in the zone get +1 Power (regression)', () => {
    let { s, me } = arena()
    const carrier = put(s, me, 'warcry-leader', 1)   // 4/3, no armor
    const ally = put(s, me, 'vanguard-sentinel', 1)  // 1/1, shares the zone
    expect(effHealth(s, s.units[carrier])).toBe(3)
    expect(effArmor(s, s.units[carrier])).toBe(0)
    expect(effPower(s, s.units[ally])).toBe(1)
    ;({ s } = attachBanner(s, me, carrier))
    expect(effHealth(s, s.units[carrier])).toBe(4)   // +1 Health on the carrier
    expect(effArmor(s, s.units[carrier])).toBe(1)    // +1 Armor on the carrier
    expect(effPower(s, s.units[ally])).toBe(2)       // +1 Power aura hits the ally
    // the carrier itself does NOT receive the +Power aura (friendlyInZone excludes the anchor)
    expect(effPower(s, s.units[carrier])).toBe(4)    // base 4, unchanged
    // the ally gets neither +Health nor +Armor — those are attached-scope, carrier only
    expect(effHealth(s, s.units[ally])).toBe(1)
    expect(effArmor(s, s.units[ally])).toBe(0)
  })

  it('a unit alive only because of the +1 Health dies the instant the banner is passed away', () => {
    let { s, me } = arena()
    const carrier = put(s, me, 'warcry-leader', 1, { damage: 3 })  // 3 damage on a 3-health body
    const heir = put(s, me, 'vanguard-sentinel', 1)               // same zone, healthy
    let banner: string
    ;({ s, banner } = attachBanner(s, me, carrier))
    expect(effHealth(s, s.units[carrier])).toBe(4)                // standing at 4 with the banner
    expect(s.units[carrier]).toBeDefined()                       // survives the attach's cleanup
    s = act(s, me, { type: 'passUpgrade', upgrade: banner, unit: heir })
    expect(s.units[carrier]).toBeUndefined()                     // the wound catches up — it dies
    expect(s.upgrades[banner].attachedTo).toBe(heir)             // the banner rode to the heir
    expect(effHealth(s, s.units[heir])).toBe(2)                  // 1 base + 1 from the banner
  })

  it('pass costs 2 resources and re-attaches to a friendly unit in the same zone', () => {
    let { s, me } = arena()
    const carrier = put(s, me, 'exemplar-knight', 1)   // 4/4
    const heir = put(s, me, 'lawbringer', 1)           // 4/4, same zone
    let banner: string
    ;({ s, banner } = attachBanner(s, me, carrier))
    const before = ready(s, me)
    s = act(s, me, { type: 'passUpgrade', upgrade: banner, unit: heir })
    expect(ready(s, me)).toBe(before - 2)              // paid exactly 2
    expect(s.upgrades[banner].attachedTo).toBe(heir)
    expect(s.units[carrier].upgrades).not.toContain(banner)
    expect(s.units[heir].upgrades).toContain(banner)
  })

  it('pass is illegal to an enemy unit, to a different zone, and when you cannot pay', () => {
    let { s, me, them } = arena()
    const carrier = put(s, me, 'exemplar-knight', 1)
    const enemy = put(s, them, 'worldrender', 1)          // enemy, same zone
    const farAlly = put(s, me, 'lawbringer', 0)           // friendly, DIFFERENT zone
    let banner: string
    ;({ s, banner } = attachBanner(s, me, carrier))
    expect(() => act(s, me, { type: 'passUpgrade', upgrade: banner, unit: enemy }))
      .toThrow(/friendly|yours/i)
    expect(() => act(s, me, { type: 'passUpgrade', upgrade: banner, unit: farAlly }))
      .toThrow(/zone/i)
    // drain the bank: a pass now can't afford its 2
    const heir = put(s, me, 'lawbringer', 1)
    for (const r of s.sides[me].resources) r.exhausted = true
    expect(() => act(s, me, { type: 'passUpgrade', upgrade: banner, unit: heir }))
      .toThrow(/pay|resource/i)
  })

  it('the banner can be passed any number of times in a round given resources', () => {
    let { s, me } = arena()
    const a = put(s, me, 'exemplar-knight', 1)
    const b = put(s, me, 'lawbringer', 1)
    const c = put(s, me, 'dawnspear-paladin', 1)   // 5/5, same zone
    let banner: string
    ;({ s, banner } = attachBanner(s, me, a))
    s = act(s, me, { type: 'passUpgrade', upgrade: banner, unit: b }); s.actorSeat = me
    expect(s.upgrades[banner].attachedTo).toBe(b)
    s = act(s, me, { type: 'passUpgrade', upgrade: banner, unit: c }); s.actorSeat = me
    expect(s.upgrades[banner].attachedTo).toBe(c)
    s = act(s, me, { type: 'passUpgrade', upgrade: banner, unit: a }); s.actorSeat = me
    expect(s.upgrades[banner].attachedTo).toBe(a)   // uncapped — three passes, all legal
  })

  it('friendly salvage of the orphaned banner is free; an enemy cannot salvage it at all', () => {
    let { s, me, them } = arena()
    const carrier = put(s, me, 'exemplar-knight', 1)
    const heir = put(s, me, 'lawbringer', 1)              // friendly, in the fallen carrier's zone
    const enemy = put(s, them, 'worldrender', 1)          // enemy, same zone
    let banner: string
    ;({ s, banner } = attachBanner(s, me, carrier))
    destroyUnit(s, s.units[carrier], 'slain')
    expect(s.upgrades[banner]).toMatchObject({ attachedTo: null, orphanedIn: 1, owner: me })

    // enemy salvage is forbidden outright — onto their own unit, in the zone, resources ready
    s.actorSeat = them
    expect(() => act(s, them, { type: 'attachOrphan', upgrade: banner, unit: enemy }))
      .toThrow(/owner|opponent|enemy|yours/i)

    // friendly salvage costs nothing — even with zero ready resources
    s.actorSeat = me
    for (const r of s.sides[me].resources) r.exhausted = true
    const before = ready(s, me)
    s = act(s, me, { type: 'attachOrphan', upgrade: banner, unit: heir })
    expect(ready(s, me)).toBe(before)                    // 0 → 0, nothing spent
    expect(s.upgrades[banner].attachedTo).toBe(heir)
  })

  it('legal actions expose pass (friendly, same-zone, not the carrier) and free friendly-only salvage', () => {
    let { s, me, them } = arena()
    const carrier = put(s, me, 'exemplar-knight', 1)
    const heir = put(s, me, 'lawbringer', 1)             // friendly, same zone
    const far = put(s, me, 'dawnspear-paladin', 0)       // friendly, other zone
    const enemy = put(s, them, 'worldrender', 1)         // enemy, same zone
    let banner: string
    ;({ s, banner } = attachBanner(s, me, carrier))

    const passes = getLegalActions(s, me).filter(a => a.type === 'passUpgrade' && a.upgrade === banner)
    const passTargets = passes.map(a => (a.type === 'passUpgrade' ? a.unit : ''))
    expect(passTargets).toContain(heir)
    expect(passTargets).not.toContain(carrier)   // never to the current carrier
    expect(passTargets).not.toContain(far)       // never across zones
    expect(passTargets).not.toContain(enemy)     // never to the enemy

    // orphan it, then check the salvage affordances for both seats
    destroyUnit(s, s.units[carrier], 'slain')
    for (const r of s.sides[me].resources) r.exhausted = true   // free salvage ignores the empty bank
    s.actorSeat = me
    const mySalvage = getLegalActions(s, me).filter(a => a.type === 'attachOrphan' && a.upgrade === banner)
    expect(mySalvage.map(a => (a.type === 'attachOrphan' ? a.unit : ''))).toContain(heir)
    s.actorSeat = them
    const theirSalvage = getLegalActions(s, them).filter(a => a.type === 'attachOrphan' && a.upgrade === banner)
    expect(theirSalvage).toEqual([])   // the enemy is offered nothing
  })
})
