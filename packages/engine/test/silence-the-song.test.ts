import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { createGame } from '../src/setup.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { getLegalActions } from '../src/legal.ts'
import { validateCardSet } from '../src/validate.ts'
import { destroyUnit } from '../src/effects.ts'
import { effPower } from '../src/helpers.ts'
import type { CardDef, GameState, Seat } from '../src/types.ts'
import { put, toHand, toLoop } from './util.ts'

// ── #122 Silence the Song — an ANY-side attach upgrade with a flat aura + host-death draw ─────
// Type flips action → upgrade. Cost 3, two purple pips. It attaches to ANY unit — your own or the
// enemy's (attach side 'any', new this card). While attached the host loses a FLAT 2 Power (an
// aura, NOT pip-scaled like Subjugate). When the HOST unit dies, the UPGRADE's owner (the caster)
// draws 2 — whether the host was theirs or the enemy's (a brand-new on-host-death trigger).

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

let n = 9000
/** Ready resources with a real purple-pip slug — satisfies both cost and the v3 pip gate. */
function fuelPurple(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `p${n++}`
    s.cardOf[id] = 'glimpse'   // Glimpse: pips [purple]
    s.sides[seat].resources.push({ id, exhausted: false })
  }
}
/** Guarantee a seat has draws to take — the host-death trigger pulls from here. */
function seedDeck(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `sd${n++}`
    s.cardOf[id] = 'glimpse'
    s.sides[seat].deck.push(id)
  }
}

/** Real-cards game under the LIVE v3 ruleset (presence pips, orphaning upgrades). */
function arena(seed = 21) {
  let s = createGame({
    seed,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: CARD_SET,
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

describe('Silence the Song (#122): any-side attach upgrade, flat −2 aura, host-death draw', () => {
  it('compiles to the locked design: upgrade, cost 3, two purple pips, any attach, flat −2 aura, host-death draw 2', () => {
    const def = CARD_SET['silence-the-song']
    expect(def.type).toBe('upgrade')
    expect(def.cost).toBe(3)
    expect(def.pips).toEqual(['purple', 'purple'])
    expect(def.attach).toEqual({ side: 'any' })
    expect(def.statics).toEqual([{ s: 'aura', scope: 'attached', p: -2 }])
    expect(def.onHostDeath).toEqual([{ op: 'draw', n: 2 }])
    expect(def.targets ?? []).toEqual([])   // the attach target is implicit, like every upgrade
    expect(def.onPlay ?? []).toEqual([])    // the old −2 buff + draw onPlay is gone
    expect(validateCardSet(CARD_SET)).toEqual([])
  })

  it('attaches to an ENEMY unit and strips a FLAT 2 Power (not pip-scaled: Worldrender, 3 pips → −2, NOT −6)', () => {
    let { s, me, them } = arena()
    const wr = put(s, them, 'worldrender', 1)          // 4 power, pips [red, red, red]
    expect(effPower(s, s.units[wr])).toBe(4)
    const card = toHand(s, me, 'silence-the-song')
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'unit', id: wr }] })
    expect(s.upgrades[card]).toMatchObject({ attachedTo: wr, owner: me })
    expect(s.units[wr].upgrades).toContain(card)
    expect(effPower(s, s.units[wr])).toBe(2)           // 4 − 2 flat (a pip-scaled −2/pip would be 4 − 6 → 0)
  })

  it("attaches to your OWN unit too (side 'any') and strips the same flat 2 Power", () => {
    let { s, me } = arena()
    const mine = put(s, me, 'shade-of-the-bazaar', 1)  // 3 power (health 2, single purple pip since #122; put bypasses cost/pips)
    expect(effPower(s, s.units[mine])).toBe(3)
    const card = toHand(s, me, 'silence-the-song')
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'unit', id: mine }] })
    expect(s.upgrades[card]).toMatchObject({ attachedTo: mine, owner: me })
    expect(effPower(s, s.units[mine])).toBe(1)         // 3 − 2 flat (a pip-scaled −2/pip would be 3 − 4 → 0)
  })

  it('ENEMY host dies → the UPGRADE owner (caster) draws 2, and the upgrade orphans (decision 67)', () => {
    let { s, me, them } = arena()
    const wr = put(s, them, 'worldrender', 1)
    const card = toHand(s, me, 'silence-the-song')
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'unit', id: wr }] })
    seedDeck(s, me, 5)
    const before = s.sides[me].hand.length
    destroyUnit(s, s.units[wr], 'slain')
    expect(s.units[wr]).toBeUndefined()
    expect(s.sides[me].hand.length).toBe(before + 2)   // the caster draws, though the host was the ENEMY's
    // decision 67: the gear doesn't dangle — it lies orphaned in the fallen host's zone
    expect(s.upgrades[card]).toMatchObject({ attachedTo: null, orphanedIn: 1 })
  })

  it('YOUR OWN host dies → you (the upgrade owner) still draw 2', () => {
    let { s, me } = arena()
    const mine = put(s, me, 'shade-of-the-bazaar', 1)
    const card = toHand(s, me, 'silence-the-song')
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'unit', id: mine }] })
    seedDeck(s, me, 5)
    const before = s.sides[me].hand.length
    destroyUnit(s, s.units[mine], 'slain')
    expect(s.units[mine]).toBeUndefined()
    expect(s.sides[me].hand.length).toBe(before + 2)
    expect(s.upgrades[card]).toMatchObject({ attachedTo: null, orphanedIn: 1 })
  })

  it("legal actions enumerate BOTH friendly and enemy hosts for the 'any' attach", () => {
    const { s, me, them } = arena()
    const mine = put(s, me, 'shade-of-the-bazaar', 1)
    const theirs = put(s, them, 'worldrender', 1)
    const card = toHand(s, me, 'silence-the-song')
    const plays = getLegalActions(s, me).filter(a => a.type === 'play' && a.card === card)
    const hosts = plays.map(a => (a.type === 'play' && a.targets?.[0]?.kind === 'unit' ? a.targets[0].id : ''))
    expect(hosts).toContain(mine)     // side 'any' lets you brand your OWN unit
    expect(hosts).toContain(theirs)   // …and the enemy's
  })

  it('validateCardSet accepts the any-attach + flat-aura + host-death shape, and gates onHostDeath to upgrades', () => {
    const base: CardDef = { slug: 'x', name: 'x', color: 'purple', type: 'upgrade', cost: 1, text: '' }
    // the real shape passes
    expect(validateCardSet({ x: { ...base, attach: { side: 'any' }, statics: [{ s: 'aura', scope: 'attached', p: -2 }], onHostDeath: [{ op: 'draw', n: 2 }] } }))
      .toEqual([])
    // onHostDeath belongs to upgrades — an action carrying it is rejected
    expect(validateCardSet({ x: { ...base, type: 'action', onHostDeath: [{ op: 'draw', n: 2 }] } })
      .some(e => e.includes('onHostDeath'))).toBe(true)
    // attach (any included) is still upgrade-only
    expect(validateCardSet({ x: { ...base, type: 'unit', power: 1, health: 1, attach: { side: 'any' } } })
      .some(e => e.includes('attach'))).toBe(true)
  })
})
