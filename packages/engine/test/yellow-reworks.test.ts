import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { createGame } from '../src/setup.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { getLegalActions } from '../src/legal.ts'
import { validateCardSet } from '../src/validate.ts'
import { damageUnit } from '../src/effects.ts'
import { influenceFor } from '../src/helpers.ts'
import type { GameState, Seat } from '../src/types.ts'
import { put, toHand, toLoop } from './util.ts'

// ── #79 Radiant Aegis + #87 Binding Light — the two ratified yellow reworks ──
// New engine primitives exercised here:
//   • grant `shielded` sets the live shield TOKEN (u.shielded), not just the keyword line
//   • the `influence` op takes an optional `cond` (fires only when the condition holds)
//   • TargetSpec gains `maxCost` (filter an enemy by printed cost)
//   • a modal card's mode gains an optional `cond` gating its LEGALITY

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

let n = 6000
/** Ready resources with a real yellow-pip slug — satisfies both cost and the v3 pip gate. */
function fuelYellow(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `y${n++}`
    s.cardOf[id] = 'iron-discipline' // Iron Plating: pips [yellow]
    s.sides[seat].resources.push({ id, exhausted: false })
  }
}

/** Real-cards game under the LIVE v3 ruleset (presence pips, blocker combat). */
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
  fuelYellow(s, me, 8)
  fuelYellow(s, them, 8)
  return { s, me, them }
}

/** Set the influence track so influenceFor(seat) === v. */
const setInf = (s: GameState, seat: Seat, v: number) => { s.influence = seat === 0 ? v : -v }

describe('Radiant Aegis (#79): shield a friendly unit; +2 influence only when below 0', () => {
  it('compiles to the locked design: action, cost 3, two yellow pips, grant-shield + conditional influence', () => {
    const def = CARD_SET['radiant-aegis']
    expect(def.type).toBe('action')
    expect(def.cost).toBe(3)
    expect(def.pips).toEqual(['yellow', 'yellow'])
    expect(def.targets).toEqual([{ t: 'unit', side: 'friendly' }])
    expect(def.onPlay).toEqual([
      { op: 'grant', t: 'chosen0', kw: { k: 'shielded' }, dur: 'perm' },
      { op: 'influence', n: 2, cond: { influenceAtMost: -1 } },
    ])
    expect(validateCardSet(CARD_SET)).toEqual([])
  })

  it('grants a live shield token that absorbs the next hit (grant no longer leaves shielded false)', () => {
    let { s, me } = arena()
    const ally = put(s, me, 'dawnspear-paladin', 1) // 5 health, no armor, prints no shield
    expect(s.units[ally].shielded).toBe(false)
    const card = toHand(s, me, 'radiant-aegis')
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'unit', id: ally }] })
    expect(s.units[ally].shielded).toBe(true) // the boolean, not just the keyword line
    // first damage instance is prevented entirely and the token flips
    damageUnit(s, s.units[ally], 3, 'test')
    expect(s.units[ally].damage).toBe(0)
    expect(s.units[ally].shielded).toBe(false)
    // the shield is spent — the next hit lands for real
    damageUnit(s, s.units[ally], 3, 'test')
    expect(s.units[ally].damage).toBe(3)
  })

  it('the +2 influence rider fires only while your influence is below 0', () => {
    // below 0 (−1): the rider fires → −1 + 2 = +1
    let a = arena()
    setInf(a.s, a.me, -1)
    const ally1 = put(a.s, a.me, 'vanguard-sentinel', 1)
    const c1 = toHand(a.s, a.me, 'radiant-aegis')
    a.s = act(a.s, a.me, { type: 'play', card: c1, targets: [{ kind: 'unit', id: ally1 }] })
    expect(a.s.units[ally1].shielded).toBe(true)
    expect(influenceFor(a.s, a.me)).toBe(1)

    // exactly 0 is NOT below 0: the shield still lands, but no influence is gained
    let b = arena(22)
    setInf(b.s, b.me, 0)
    const ally2 = put(b.s, b.me, 'vanguard-sentinel', 1)
    const c2 = toHand(b.s, b.me, 'radiant-aegis')
    b.s = act(b.s, b.me, { type: 'play', card: c2, targets: [{ kind: 'unit', id: ally2 }] })
    expect(b.s.units[ally2].shielded).toBe(true)
    expect(influenceFor(b.s, b.me)).toBe(0)
  })
})

describe('Binding Light (#87): modal exhaust — Weak / Cheap / Overwhelm', () => {
  it('compiles to the locked design: modal action, cost 2, one yellow pip, three enemy-exhaust modes', () => {
    const def = CARD_SET['binding-light']
    expect(def.type).toBe('action')
    expect(def.cost).toBe(2)
    expect(def.pips).toEqual(['yellow'])
    expect(def.modes?.map(m => m.label)).toEqual(['Weak', 'Cheap', 'Overwhelm'])
    expect(def.modes?.[0].targets).toEqual([{ t: 'unit', side: 'enemy', maxPower: 4 }])
    expect(def.modes?.[1].targets).toEqual([{ t: 'unit', side: 'enemy', maxCost: 4 }])
    expect(def.modes?.[2].targets).toEqual([{ t: 'unit', side: 'enemy' }])
    expect(def.modes?.[2].cond).toEqual({ influenceAtLeast: 8 })
    for (const m of def.modes ?? []) expect(m.ops).toEqual([{ op: 'exhaust', t: 'chosen0' }])
    expect(validateCardSet(CARD_SET)).toEqual([])
  })

  it('mode 0 (Weak) exhausts a low-power enemy and rejects a high-power one', () => {
    let { s, me, them } = arena()
    const small = put(s, them, 'cinder-initiate', 1) // 2 power
    const big = put(s, them, 'worldrender', 1)        // 5 power
    const c1 = toHand(s, me, 'binding-light')
    s = act(s, me, { type: 'play', card: c1, mode: 0, targets: [{ kind: 'unit', id: small }] })
    expect(s.units[small].exhausted).toBe(true)
    s.actorSeat = me
    const c2 = toHand(s, me, 'binding-light')
    expect(() => act(s, me, { type: 'play', card: c2, mode: 0, targets: [{ kind: 'unit', id: big }] }))
      .toThrow(/power/i)
  })

  it('mode 1 (Cheap) filters on COST — exhausts a cheap enemy, rejects a costly one even if its power qualifies', () => {
    let { s, me, them } = arena()
    const cheap = put(s, them, 'cinder-initiate', 1)   // cost 1
    const costly = put(s, them, 'gateward-colossus', 1) // cost 6, power 3 (would pass a maxPower check)
    const c1 = toHand(s, me, 'binding-light')
    s = act(s, me, { type: 'play', card: c1, mode: 1, targets: [{ kind: 'unit', id: cheap }] })
    expect(s.units[cheap].exhausted).toBe(true)
    s.actorSeat = me
    const c2 = toHand(s, me, 'binding-light')
    expect(() => act(s, me, { type: 'play', card: c2, mode: 1, targets: [{ kind: 'unit', id: costly }] }))
      .toThrow(/cost/i)
    // legal enumeration also refuses the costly host for mode 1
    const mode1Hosts = getLegalActions(s, me)
      .filter(a => a.type === 'play' && a.card === c2 && a.mode === 1)
      .flatMap(a => (a.type === 'play' ? a.targets ?? [] : []))
      .map(t => (t.kind === 'unit' ? t.id : ''))
    expect(mode1Hosts).toContain(cheap)
    expect(mode1Hosts).not.toContain(costly)
  })

  it('mode 2 (Overwhelm) is gated on 8+ influence — illegal below, legal at/above, and hits anything', () => {
    // board holds only a big enemy that no other mode can touch (power 5, cost 8)
    let { s, me, them } = arena()
    const big = put(s, them, 'worldrender', 1)
    const card = toHand(s, me, 'binding-light')

    // below the bar: mode 2 is not offered and a direct attempt is rejected
    setInf(s, me, 0)
    const belowMode2 = getLegalActions(s, me).filter(a => a.type === 'play' && a.card === card && a.mode === 2)
    expect(belowMode2).toHaveLength(0)
    expect(() => act(s, me, { type: 'play', card, mode: 2, targets: [{ kind: 'unit', id: big }] }))
      .toThrow(/unavailable/i)
    expect(s.units[big].exhausted).toBe(false)

    // at the bar (8): mode 2 is offered and exhausts the otherwise-untouchable enemy
    setInf(s, me, 8)
    const atMode2 = getLegalActions(s, me).filter(a => a.type === 'play' && a.card === card && a.mode === 2)
    expect(atMode2.length).toBeGreaterThan(0)
    const s2 = act(s, me, { type: 'play', card, mode: 2, targets: [{ kind: 'unit', id: big }] })
    expect(s2.units[big].exhausted).toBe(true)
  })
})
