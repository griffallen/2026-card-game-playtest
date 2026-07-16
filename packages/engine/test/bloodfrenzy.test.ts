import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { createGame } from '../src/setup.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { validateCardSet } from '../src/validate.ts'
import { destroyUnit } from '../src/effects.ts'
import { effHealth, effPower, hasKw } from '../src/helpers.ts'
import type { GameState, Seat } from '../src/types.ts'
import { put, toHand, toLoop } from './util.ts'

// ── #107 Bloodfrenzy — a CONDITIONAL attached aura ───────────────────────────
// Locked spec (Griff, #107): "Attached unit gets +1 Power and +1 Health and
// Breakthrough. If you have Influence 0 or less, this unit gets +2 Power and +2
// Health instead." The bonus re-checks LIVE as Influence swings (decision on #107),
// and the "+2 instead" does NOT stack — it is +2/+2 total, never +3/+3.
//
// Wiring: three attached auras — a Breakthrough grant (unconditional) plus two
// mutually-exclusive stat auras gated on the controller's live Influence
// (+1/+1 while ahead, +2/+2 while at 0 or below). The engine now honors an
// attached aura's `cond`, re-evaluated every effPower/effHealth read.

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

let n = 7000
/** Ready resources with a real red-pip slug — satisfies both cost and the v3 pip gate. */
function fuelRed(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `rr${n++}`
    s.cardOf[id] = 'cinder-initiate' // pips [red]
    s.sides[seat].resources.push({ id, exhausted: false })
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
  fuelRed(s, me, 8)
  return { s, me, them }
}

/** Set `seat`'s Influence to exactly v, from that seat's perspective. */
function setInfluence(s: GameState, seat: Seat, v: number) {
  s.influence = seat === 0 ? v : -v
}

/** Play Bloodfrenzy from `seat`'s hand onto a friendly carrier. */
function attachFrenzy(s: GameState, seat: Seat, carrier: string): { s: GameState; frenzy: string } {
  const frenzy = toHand(s, seat, 'bloodfrenzy')
  s = act(s, seat, { type: 'play', card: frenzy, targets: [{ kind: 'unit', id: carrier }] })
  s.actorSeat = seat // fixtures drive one seat; ignore the window flip
  return { s, frenzy }
}

describe('Bloodfrenzy (#107): conditional attached aura, +1/+1 or +2/+2 + Breakthrough', () => {
  it('compiles to the locked design: upgrade, cost 3, two red pips, three attached auras, no life engine', () => {
    const def = CARD_SET['bloodfrenzy']
    expect(def.type).toBe('upgrade')
    expect(def.cost).toBe(3)
    expect(def.pips).toEqual(['red', 'red'])
    // base band while ahead on Influence
    expect(def.statics).toContainEqual({ s: 'aura', scope: 'attached', p: 1, h: 1, cond: { influenceAtLeast: 1 } })
    // the desperation band — +2/+2 INSTEAD (mutually exclusive with the base band)
    expect(def.statics).toContainEqual({ s: 'aura', scope: 'attached', p: 2, h: 2, cond: { influenceAtMost: 0 } })
    // Breakthrough is unconditional while attached
    expect(def.statics).toContainEqual({ s: 'aura', scope: 'attached', kw: { k: 'breakthrough' } })
    expect(def.statics).toHaveLength(3)
    // the old ≤10-life startOfRound engine is gone
    expect(def.startOfRound).toBeUndefined()
    expect(def.text).toContain('Breakthrough')
    expect(def.text).toContain('+2 Power and +2 Health')
    expect(validateCardSet(CARD_SET)).toEqual([])
  })

  it('while ahead on Influence (>0): +1 Power, +1 Health, and Breakthrough granted', () => {
    let { s, me } = arena()
    const carrier = put(s, me, 'cinder-initiate', 1) // 2/1, rush, no breakthrough
    const p0 = effPower(s, s.units[carrier])
    const h0 = effHealth(s, s.units[carrier])
    expect(hasKw(s, s.units[carrier], 'breakthrough')).toBe(false)
    ;({ s } = attachFrenzy(s, me, carrier))
    setInfluence(s, me, 4)
    expect(effPower(s, s.units[carrier])).toBe(p0 + 1)
    expect(effHealth(s, s.units[carrier])).toBe(h0 + 1)
    expect(hasKw(s, s.units[carrier], 'breakthrough')).toBe(true)
  })

  it('at Influence 0 or less: +2 Power, +2 Health INSTEAD (never +3/+3), Breakthrough kept', () => {
    let { s, me } = arena()
    const carrier = put(s, me, 'cinder-initiate', 1)
    const p0 = effPower(s, s.units[carrier])
    const h0 = effHealth(s, s.units[carrier])
    ;({ s } = attachFrenzy(s, me, carrier))
    // exactly 0 counts as "0 or less"
    setInfluence(s, me, 0)
    expect(effPower(s, s.units[carrier])).toBe(p0 + 2)
    expect(effHealth(s, s.units[carrier])).toBe(h0 + 2)
    expect(hasKw(s, s.units[carrier], 'breakthrough')).toBe(true)
    // deep negative is the SAME +2/+2 — the bands don't stack into +3/+3
    setInfluence(s, me, -5)
    expect(effPower(s, s.units[carrier])).toBe(p0 + 2)
    expect(effHealth(s, s.units[carrier])).toBe(h0 + 2)
    expect(effPower(s, s.units[carrier])).not.toBe(p0 + 3)
  })

  it('re-checks LIVE as Influence swings across zero, both directions', () => {
    let { s, me } = arena()
    const carrier = put(s, me, 'cinder-initiate', 1)
    const p0 = effPower(s, s.units[carrier])
    const h0 = effHealth(s, s.units[carrier])
    ;({ s } = attachFrenzy(s, me, carrier))
    setInfluence(s, me, 5) // ahead → +1/+1
    expect(effPower(s, s.units[carrier])).toBe(p0 + 1)
    expect(effHealth(s, s.units[carrier])).toBe(h0 + 1)
    setInfluence(s, me, 0) // fall to 0 → grows to +2/+2
    expect(effPower(s, s.units[carrier])).toBe(p0 + 2)
    expect(effHealth(s, s.units[carrier])).toBe(h0 + 2)
    setInfluence(s, me, 1) // climb back to +1 → shrinks to +1/+1
    expect(effPower(s, s.units[carrier])).toBe(p0 + 1)
    expect(effHealth(s, s.units[carrier])).toBe(h0 + 1)
    setInfluence(s, me, -1) // dip below zero → grows again
    expect(effPower(s, s.units[carrier])).toBe(p0 + 2)
    expect(effHealth(s, s.units[carrier])).toBe(h0 + 2)
    // Breakthrough is unconditional through every swing
    expect(hasKw(s, s.units[carrier], 'breakthrough')).toBe(true)
  })

  it('the aura is scoped to the wearer — a friendly ally without it is never touched', () => {
    let { s, me } = arena()
    const carrier = put(s, me, 'cinder-initiate', 1)
    const ally = put(s, me, 'cinder-initiate', 1) // same zone, no upgrade
    const ap = effPower(s, s.units[ally])
    const ah = effHealth(s, s.units[ally])
    ;({ s } = attachFrenzy(s, me, carrier))
    setInfluence(s, me, -5) // desperation band active
    expect(effPower(s, s.units[ally])).toBe(ap)
    expect(effHealth(s, s.units[ally])).toBe(ah)
    expect(hasKw(s, s.units[ally], 'breakthrough')).toBe(false)
  })

  it('the bonus leaves with the aura: an orphaned Bloodfrenzy grants nothing', () => {
    let { s, me } = arena()
    const carrier = put(s, me, 'cinder-initiate', 1)
    let frenzy: string
    ;({ s, frenzy } = attachFrenzy(s, me, carrier))
    setInfluence(s, me, -5)
    expect(effPower(s, s.units[carrier])).toBe(2 + 2) // 2 base + 2 desperation
    // carrier falls → the upgrade orphans (v3, decision 67), attached to no one
    destroyUnit(s, s.units[carrier], 'slain')
    expect(s.upgrades[frenzy].attachedTo).toBeNull()
    // a fresh body in the zone gets nothing from the free-lying frenzy
    const fresh = put(s, me, 'cinder-initiate', 1)
    expect(effPower(s, s.units[fresh])).toBe(2)
    expect(effHealth(s, s.units[fresh])).toBe(1)
    expect(hasKw(s, s.units[fresh], 'breakthrough')).toBe(false)
  })
})
