import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { createGame } from '../src/setup.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { validateCardSet } from '../src/validate.ts'
import { effPower, effHealth, influenceFor } from '../src/helpers.ts'
import type { CardDef, GameState, Seat } from '../src/types.ts'
import { put, toHand, toLoop } from './util.ts'

// ── #122 Wither — a persistent rot CURSE the caster attaches to an enemy unit ─────────────────
// Type flips action → enemy-attach upgrade (reusing Subjugate's enemy-attach machinery). Cost 2,
// one purple pip (was two). On play it stamps a permanent −1/−1 on the host; at each round-start
// thereafter it stamps ANOTHER permanent −1/−1 — the rot ACCUMULATES (play: −1/−1; next round: −2/−2;
// then −3/−3…), a slow death-spiral. Power floors at 0; a unit withered to 0 Health dies in the
// standard sweep (onDeath fires). The curse is a normal upgrade — destroyable to stop the rot, but the
// −1/−1s already applied REMAIN. When its host dies the curse is CONSUMED with it, never orphaning.

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

let n = 7000
/** Ready resources with a real purple-pip slug — satisfies both cost and the v3 pip gate. */
function fuelPurple(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `wp${n++}`
    s.cardOf[id] = 'glimpse'   // Glimpse: pips [purple]
    s.sides[seat].resources.push({ id, exhausted: false })
  }
}
/** Ready resources with a real red-pip slug — for the enemy's Pillage (red, needs a red presence). */
function fuelRed(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `wr${n++}`
    s.cardOf[id] = 'cinder-initiate'   // Cinder Initiate: pips [red]
    s.sides[seat].resources.push({ id, exhausted: false })
  }
}
/** Filler deck so multi-round drives never deck out (which would bleed life/influence). */
function seedDeck(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `wd${n++}`
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
  fuelPurple(s, me, 10)
  fuelPurple(s, them, 10)
  seedDeck(s, me, 12)
  seedDeck(s, them, 12)
  return { s, me, them }
}

/** Two consecutive passes end the round; toLoop then drives both start steps (each host owner's
 *  start step is where its attached Wither ticks). One call = one round transition = one tick. */
function nextRound(s: GameState): GameState {
  s = act(s, s.actorSeat, { type: 'pass' })
  s = act(s, s.actorSeat, { type: 'pass' })
  return toLoop(s)
}

describe('Wither (#122): enemy-attach rot curse, accumulating −1/−1 per round', () => {
  it('compiles to the locked design: upgrade, cost 2, one purple pip, enemy attach, consumed-on-death, onPlay + startOfRound −1/−1', () => {
    const def = CARD_SET['wither']
    expect(def.type).toBe('upgrade')
    expect(def.cost).toBe(2)
    expect(def.pips).toEqual(['purple'])                       // dropped from two pips to one
    expect(def.attach).toEqual({ side: 'enemy', consumedOnHostDeath: true })
    expect(def.onPlay).toEqual([{ op: 'buff', t: 'attached', p: -1, h: -1, dur: 'perm' }])
    expect(def.startOfRound).toEqual({ ops: [{ op: 'buff', t: 'attached', p: -1, h: -1, dur: 'perm' }] })
    expect(def.targets ?? []).toEqual([])                      // the attach target is implicit, like every upgrade
    expect(def.power).toBeUndefined()                          // an upgrade carries no body
    expect(def.health).toBeUndefined()
    expect(validateCardSet(CARD_SET)).toEqual([])
  })

  it('attaches to an enemy unit for −1/−1 on play, then withers a further −1/−1 at each round-start (accumulates)', () => {
    let { s, me, them } = arena()
    const host = put(s, them, 'crimson-behemoth', 1)          // 6/6, no passive statics
    expect(effPower(s, s.units[host])).toBe(6)
    expect(effHealth(s, s.units[host])).toBe(6)

    const card = toHand(s, me, 'wither')
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'unit', id: host }] })
    expect(s.upgrades[card]).toMatchObject({ attachedTo: host, owner: me })
    expect(s.units[host].upgrades).toContain(card)
    expect(effPower(s, s.units[host])).toBe(5)                 // on play: −1/−1
    expect(effHealth(s, s.units[host])).toBe(5)

    s = nextRound(s)                                           // one round-start tick
    expect(effPower(s, s.units[host])).toBe(4)                 // −2/−2 total — the rot deepens
    expect(effHealth(s, s.units[host])).toBe(4)

    s = nextRound(s)                                           // another tick
    expect(effPower(s, s.units[host])).toBe(3)                 // −3/−3 total
    expect(effHealth(s, s.units[host])).toBe(3)
  })

  it('two Withers on one host stack independently — −2/−2 on play, then −2/−2 every round', () => {
    let { s, me, them } = arena()
    const host = put(s, them, 'crimson-behemoth', 1)          // 6/6
    const c1 = toHand(s, me, 'wither')
    s = act(s, me, { type: 'play', card: c1, targets: [{ kind: 'unit', id: host }] })
    s.actorSeat = me                                          // second cast in a fresh window (fixture drives the seat)
    const c2 = toHand(s, me, 'wither')
    s = act(s, me, { type: 'play', card: c2, targets: [{ kind: 'unit', id: host }] })
    expect(s.units[host].upgrades).toEqual(expect.arrayContaining([c1, c2]))
    expect(effPower(s, s.units[host])).toBe(4)                // two on-play stamps: −2/−2
    expect(effHealth(s, s.units[host])).toBe(4)

    s = nextRound(s)                                          // both tick, independently
    expect(effPower(s, s.units[host])).toBe(2)                // −4/−4 total
    expect(effHealth(s, s.units[host])).toBe(2)
  })

  it('accumulates to 0 Health → the host dies in the standard sweep, and the curse is CONSUMED with it (not orphaned)', () => {
    let { s, me, them } = arena()
    const host = put(s, them, 'mist-stalker', 1)             // 2/2
    const card = toHand(s, me, 'wither')
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'unit', id: host }] })
    expect(effHealth(s, s.units[host])).toBe(1)              // 2 − 1, still standing
    expect(effPower(s, s.units[host])).toBe(1)

    s = nextRound(s)                                         // tick brings effHealth to 0 → death sweep
    expect(s.units[host]).toBeUndefined()                   // felled by the rot
    expect(s.sides[them].discard).toContain(host)           // normal death → owner's discard

    // consumed with its host: NOT orphaned (contrast Silence the Song, which orphans in the zone)
    expect(s.upgrades[card]).toBeUndefined()                // no orphan instance survives
    expect(s.sides[me].discard).toContain(card)             // the curse goes to its owner's discard
    expect(Object.values(s.units).some(u => u.upgrades.includes(card))).toBe(false)
  })

  it('a unit withered to 0 Health dies through the normal path — onDeath fires', () => {
    let { s, me, them } = arena()
    const host = put(s, them, 'vanguard-sentinel', 1)       // 1/1, onDeath: its owner gains 1 Influence
    const before = influenceFor(s, them)
    const card = toHand(s, me, 'wither')
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'unit', id: host }] })  // −1/−1 → 0 Health → dies now
    expect(s.units[host]).toBeUndefined()
    expect(influenceFor(s, them)).toBe(before + 1)          // onDeath fired for the host's owner
    expect(s.upgrades[card]).toBeUndefined()                // and the curse is consumed, not orphaned
    expect(s.sides[me].discard).toContain(card)
  })

  it('destroying the Wither upgrade stops future ticks, but the −1/−1s already applied REMAIN (scars persist)', () => {
    let { s, me, them } = arena()
    const host = put(s, them, 'crimson-behemoth', 1)        // 6/6
    fuelRed(s, them, 6)                                     // the enemy needs a red presence to cast Pillage
    const card = toHand(s, me, 'wither')
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'unit', id: host }] })
    expect(effPower(s, s.units[host])).toBe(5)             // −1/−1 applied
    expect(effHealth(s, s.units[host])).toBe(5)

    // the enemy answers the curse with Pillage (destroy target enemy upgrade)
    const pillage = toHand(s, them, 'pillage')
    s = act(s, them, { type: 'play', card: pillage, targets: [{ kind: 'upgrade', id: card }] })
    expect(s.upgrades[card]).toBeUndefined()               // curse removed
    expect(s.units[host].upgrades).not.toContain(card)
    expect(effPower(s, s.units[host])).toBe(5)             // but the scar remains — the perm −1/−1 stands
    expect(effHealth(s, s.units[host])).toBe(5)

    s = nextRound(s)                                        // no upgrade → no further tick
    expect(effPower(s, s.units[host])).toBe(5)             // still −1/−1, no deeper
    expect(effHealth(s, s.units[host])).toBe(5)
  })

  it('validateCardSet accepts the enemy-attach + consume + startOfRound shape, and gates consumedOnHostDeath', () => {
    const base: CardDef = { slug: 'x', name: 'x', color: 'purple', type: 'upgrade', cost: 1, text: '' }
    // the real shape passes
    expect(validateCardSet({ x: {
      ...base,
      attach: { side: 'enemy', consumedOnHostDeath: true },
      onPlay: [{ op: 'buff', t: 'attached', p: -1, h: -1, dur: 'perm' }],
      startOfRound: { ops: [{ op: 'buff', t: 'attached', p: -1, h: -1, dur: 'perm' }] },
    } })).toEqual([])
    // consumedOnHostDeath must be a boolean
    expect(validateCardSet({ x: { ...base, attach: { side: 'enemy', consumedOnHostDeath: 'yes' as never } } })
      .some(e => e.includes('consumedOnHostDeath'))).toBe(true)
    // attach (consume flag included) is still upgrade-only
    expect(validateCardSet({ x: { ...base, type: 'unit', power: 1, health: 1, attach: { side: 'enemy', consumedOnHostDeath: true } } })
      .some(e => e.includes('attach'))).toBe(true)
  })
})
