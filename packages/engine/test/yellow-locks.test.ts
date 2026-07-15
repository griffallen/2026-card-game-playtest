import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { createGame } from '../src/setup.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { validateCardSet } from '../src/validate.ts'
import { damageBase, destroyUnit } from '../src/effects.ts'
import { influenceFor } from '../src/helpers.ts'
import { homeZone } from '../src/types.ts'
import type { GameState, Seat } from '../src/types.ts'
import { put, toHand, toLoop } from './util.ts'

// ── #89 Radiant Judgment · #88 Devout Intervention · #85 Aura of Resolve ──
// New engine primitives exercised here:
//   • UnitFilter.maxCostInfluence — exhaust filter tied to the controller's LIVE influence (#89)
//   • UnitFilter.zone 'controllerHome' — the caster's own Home (#89 comeback per-count)
//   • ops `wardHome` / `wardBlocker` + state.homeWard/blockerWard/unit.blockWard (#88)
//   • damageBase(..., fromAttack) — only attacks trip the Home ward, not spells (#88)
//   • PerCount 'deathsThisRound' + state.deaths ledger, incremented in destroyUnit (#85)

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

let n = 7000
/** Ready resources with a real yellow-pip slug — satisfies both cost and the v3 pip gate. */
function fuelYellow(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `y${n++}`
    s.cardOf[id] = 'iron-discipline' // Iron Plating: pips [yellow]
    s.sides[seat].resources.push({ id, exhausted: false })
  }
}

/** Real-cards game under the LIVE v3 ruleset (presence pips, blocker combat). me acts first. */
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

describe('Radiant Judgment (#89): +1, then exhaust by live-influence cost, then a below-1 comeback', () => {
  it('compiles to the locked design: action, cost 5, two yellow pips, three ordered ops', () => {
    const def = CARD_SET['radiant-judgment']
    expect(def.type).toBe('action')
    expect(def.cost).toBe(5)
    expect(def.pips).toEqual(['yellow', 'yellow'])
    expect(def.onPlay).toEqual([
      { op: 'influence', n: 1 },
      { op: 'exhaust', t: { side: 'enemy', maxCostInfluence: true } },
      { op: 'influence', n: 1, cond: { influenceAtMost: 0 }, per: { count: 'units', f: { side: 'enemy', zone: 'controllerHome' } } },
    ])
    expect(validateCardSet(CARD_SET)).toEqual([])
  })

  it('the +1 lands BEFORE the exhaust — a cost-4 enemy is stilled only because influence rose to 4', () => {
    let { s, me, them } = arena()
    setInf(s, me, 3)                                   // 3 → 4 after the rider
    const cheap = put(s, them, 'cinder-initiate', 1)   // cost 1 → exhausted
    const four = put(s, them, 'exemplar-knight', 1)    // cost 4 → exhausted (4 > 3, ≤ 4: proves ordering)
    const five = put(s, them, 'custodian-of-law', 1)   // cost 5 → safe
    const big = put(s, them, 'worldrender', 1)         // cost 8 → safe
    const card = toHand(s, me, 'radiant-judgment')
    s = act(s, me, { type: 'play', card })
    expect(s.units[cheap].exhausted).toBe(true)
    expect(s.units[four].exhausted).toBe(true)
    expect(s.units[five].exhausted).toBe(false)
    expect(s.units[big].exhausted).toBe(false)
    expect(influenceFor(s, me)).toBe(4)                // comeback silent above 0
  })

  it('below 1 after the +1: the comeback pays 1 per enemy in YOUR Home (only your Home counts)', () => {
    let { s, me, them } = arena()
    setInf(s, me, -3)                                       // -3 → -2 after the rider (≤ 0 → comeback fires)
    const inHome1 = put(s, them, 'cinder-initiate', homeZone(me))
    const inHome2 = put(s, them, 'vanguard-sentinel', homeZone(me))
    const elsewhere = put(s, them, 'berserker', 1)          // neutral — must NOT count
    const card = toHand(s, me, 'radiant-judgment')
    s = act(s, me, { type: 'play', card })
    // -3, +1 = -2; exhaust by cost ≤ -2 stills nothing; +1 per enemy in my Home (2) → 0
    expect(influenceFor(s, me)).toBe(0)
    expect(s.units[inHome1].exhausted).toBe(false)          // cost ≤ -2 is impossible
    expect(s.units[inHome2].exhausted).toBe(false)
    expect(s.units[elsewhere].exhausted).toBe(false)
  })

  it('the comeback stays silent when the +1 leaves you at/above 1, even with enemies in your Home', () => {
    let { s, me, them } = arena()
    setInf(s, me, 0)                                    // 0 → 1 after the rider (> 0 → no comeback)
    put(s, them, 'cinder-initiate', homeZone(me))
    put(s, them, 'vanguard-sentinel', homeZone(me))
    const card = toHand(s, me, 'radiant-judgment')
    s = act(s, me, { type: 'play', card })
    expect(influenceFor(s, me)).toBe(1)                 // just the +1; no per-Home bonus
  })
})

describe('Devout Intervention (#88): a Home ward and a blocker ward, both one-shot', () => {
  it('compiles to the locked design: action, cost 4, two yellow pips, two ward ops', () => {
    const def = CARD_SET['devout-intervention']
    expect(def.type).toBe('action')
    expect(def.cost).toBe(4)
    expect(def.pips).toEqual(['yellow', 'yellow'])
    expect(def.onPlay).toEqual([{ op: 'wardHome' }, { op: 'wardBlocker' }])
    expect(validateCardSet(CARD_SET)).toEqual([])
  })

  it('Home ward: the whole next attack on your Home is turned aside, then the ward is spent', () => {
    let { s, me, them } = arena()
    const s1 = put(s, them, 'doombringer', homeZone(me))   // 5/4 — 5 to the base
    const s2 = put(s, them, 'doombringer', homeZone(me))
    const devout = toHand(s, me, 'devout-intervention')
    s = act(s, me, { type: 'play', card: devout })
    expect(s.homeWard[me]).toBe(true)
    // first assault — no blockers in my Home, so it auto-resolves onto the base and is fully warded
    s = act(s, them, { type: 'attack', attackers: [s1], target: { kind: 'base', seat: me } })
    expect(s.sides[me].life).toBe(20)
    expect(s.homeWard[me]).toBe(false)                     // real prevention spent it
    // second assault lands in full — the ward is gone
    s = act(s, me, { type: 'pass' })
    s = act(s, them, { type: 'attack', attackers: [s2], target: { kind: 'base', seat: me } })
    expect(s.sides[me].life).toBe(15)
  })

  it('Home ward (primitive): a spell is ignored; only a real attack spends it', () => {
    const { s, me } = arena()
    s.homeWard[me] = true
    damageBase(s, me, 4, 'a spell', false)                 // fromAttack=false → ward untouched
    expect(s.homeWard[me]).toBe(true)
    expect(s.sides[me].life).toBe(16)
    damageBase(s, me, 6, 'an assault', true)               // fromAttack=true → fully warded
    expect(s.homeWard[me]).toBe(false)
    expect(s.sides[me].life).toBe(16)                      // the 6 never lands
  })

  it('Home ward feint: an attack that gets fully blocked leaves the ward armed', () => {
    let { s, me, them } = arena()
    const attacker = put(s, them, 'exemplar-knight', homeZone(me)) // 4/4, no breakthrough
    const blocker = put(s, me, 'custodian-of-law', homeZone(me))   // 3/6 — soaks it whole
    const devout = toHand(s, me, 'devout-intervention')
    s = act(s, me, { type: 'play', card: devout })
    s = act(s, them, { type: 'attack', attackers: [attacker], target: { kind: 'base', seat: me } })
    expect(s.phase).toBe('block')
    s = act(s, me, { type: 'block', pairs: [{ blocker, onto: attacker }] })
    expect(s.sides[me].life).toBe(20)          // the base never took a hit…
    expect(s.homeWard[me]).toBe(true)          // …so the Home ward is untouched, still waiting
  })

  it('blocker ward: the warded blocker takes 0 yet still deals its counter (control: without it, 5)', () => {
    // control — no ward: the blocker soaks worldrender's 5
    {
      let { s, me, them } = arena(30)
      const attacker = put(s, them, 'worldrender', homeZone(me))    // 5/10
      const blocker = put(s, me, 'custodian-of-law', homeZone(me))  // 3/6
      s = act(s, me, { type: 'pass' })
      s = act(s, them, { type: 'attack', attackers: [attacker], target: { kind: 'base', seat: me } })
      s = act(s, me, { type: 'block', pairs: [{ blocker, onto: attacker }] })
      expect(s.units[blocker].damage).toBe(5)
    }
    // warded: Devout stamps the blocker — it takes 0, but its 3 counter still lands
    let { s, me, them } = arena(30)
    const attacker = put(s, them, 'worldrender', homeZone(me))
    const blocker = put(s, me, 'custodian-of-law', homeZone(me))
    const devout = toHand(s, me, 'devout-intervention')
    s = act(s, me, { type: 'play', card: devout })
    expect(s.blockerWard[me]).toBe(true)
    s = act(s, them, { type: 'attack', attackers: [attacker], target: { kind: 'base', seat: me } })
    s = act(s, me, { type: 'block', pairs: [{ blocker, onto: attacker }] })
    expect(s.units[blocker].damage).toBe(0)      // warded — no damage
    expect(s.units[attacker].damage).toBe(3)     // …but still strikes back (custodian power 3)
    expect(s.blockerWard[me]).toBe(false)        // ward consumed at block time
    expect(s.units[blocker].blockWard).toBeFalsy() // one-fight token cleared
    expect(s.sides[me].life).toBe(20)            // base untouched (worldrender fully blocked)
  })

  it('both wards clear at the round boundary', () => {
    let { s, me } = arena()
    s.homeWard[me] = true
    s.blockerWard[me] = true
    s = act(s, s.actorSeat, { type: 'pass' })
    s = act(s, s.actorSeat, { type: 'pass' })   // two passes end the round
    expect(s.homeWard).toEqual([false, false])
    expect(s.blockerWard).toEqual([false, false])
  })
})

describe('Aura of Resolve (#85): the per-round death ledger', () => {
  it('compiles to the locked design: cost-0 action reading deathsThisRound both ways', () => {
    const def = CARD_SET['aura-of-resolve']
    expect(def.type).toBe('action')
    expect(def.cost).toBe(0)
    expect(def.pips).toEqual(['yellow', 'yellow'])
    expect(def.onPlay).toEqual([
      { op: 'heal', t: 'selfBase', n: 2, per: { count: 'deathsThisRound', side: 'friendly' } },
      { op: 'damage', t: 'enemyBase', n: 2, per: { count: 'deathsThisRound', side: 'enemy' } },
    ])
    expect(validateCardSet(CARD_SET)).toEqual([])
  })

  it('counts deaths by owner side and pays 2 Life each way', () => {
    let { s, me, them } = arena()
    const f1 = put(s, me, 'cinder-initiate', 1)
    const f2 = put(s, me, 'vanguard-sentinel', 1)
    const e1 = put(s, them, 'berserker', 1)
    destroyUnit(s, s.units[f1], 'test')
    destroyUnit(s, s.units[f2], 'test')
    destroyUnit(s, s.units[e1], 'test')
    expect(s.deaths[me]).toBe(2)
    expect(s.deaths[them]).toBe(1)
    const meLife = s.sides[me].life, themLife = s.sides[them].life
    const aura = toHand(s, me, 'aura-of-resolve')
    s = act(s, me, { type: 'play', card: aura })
    expect(s.sides[me].life).toBe(meLife + 4)     // 2 friendly deaths × 2
    expect(s.sides[them].life).toBe(themLife - 2) // 1 enemy death × 2
  })

  it('the ledger clears at the round boundary', () => {
    let { s, me } = arena()
    const f1 = put(s, me, 'cinder-initiate', 1)
    destroyUnit(s, s.units[f1], 'test')
    expect(s.deaths[me]).toBe(1)
    s = act(s, s.actorSeat, { type: 'pass' })
    s = act(s, s.actorSeat, { type: 'pass' })
    expect(s.deaths).toEqual([0, 0])
  })

  it('a created copy that vanishes still counts as a death (decision #69)', () => {
    const { s, me } = arena()
    const id = put(s, me, 'cinder-initiate', 1)
    s.units[id].created = {}                 // an effect-minted copy, not a deck card
    destroyUnit(s, s.units[id], 'test')
    expect(s.deaths[me]).toBe(1)
    expect(s.units[id]).toBeUndefined()
    expect(s.sides[me].discard).not.toContain(id)   // it vanished — no discard trace
  })
})
