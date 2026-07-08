import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { createGame } from '../src/setup.ts'
import { DEFAULT_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { effPower, effArmor, influenceFor, hasKw } from '../src/helpers.ts'
import { homeZone } from '../src/types.ts'
import type { GameState, Seat } from '../src/types.ts'
import { fuel, put, toHand, toLoop } from './util.ts'

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

/** Real-cards game advanced into the action loop, p1 = initiative holder, both fuelled. */
function arena(seed = 11) {
  let s = createGame({
    seed,
    rules: { ...DEFAULT_RULES, chooseStartingResources: false },
    cardSet: CARD_SET,
    players: [
      { name: 'Ada', deck: deckSlugs(PREBUILT_DECKS[0]) },
      { name: 'Bo', deck: deckSlugs(PREBUILT_DECKS[1]) },
    ],
  })
  s = toLoop(s)
  const p1 = s.actorSeat
  const p2 = (1 - p1) as Seat
  fuel(s, p1, 20)
  fuel(s, p2, 20)
  return { s, p1, p2 }
}

/** End the current round and advance start steps until `seat`'s start step has run (spec §1.4). */
function toStartStepOf(s: GameState, seat: Seat): GameState {
  s = toLoop(s)                                   // finish any pending bank steps into the loop
  s = act(s, s.actorSeat, { type: 'pass' })       // two consecutive passes end the round…
  s = act(s, s.actorSeat, { type: 'pass' })       // …startRound runs the initiative holder's step
  while (s.phase === 'bank' && s.startStep !== seat) {
    s = act(s, s.actorSeat, { type: 'skipResource' })
  }
  return s
}

describe('influence effects', () => {
  it('decision 34: influence is earned by events — guards pay when they DEFEND, never for existing', () => {
    let { s, p1, p2 } = arena()
    const sentinel = toHand(s, p2, 'vanguard-sentinel')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: sentinel })
    expect(influenceFor(s, p2)).toBe(0)                    // entering play pays nothing now
    // red spells no longer cede influence (decision 35 removed the artifact reading)
    const bolt = toHand(s, p1, 'searing-bolt')
    const victim = put(s, p2, 'sunguard-defender', 2)
    s = act(s, p1, { type: 'play', card: bolt, targets: [{ kind: 'unit', id: victim }] })
    expect(influenceFor(s, p2)).toBe(0)
    expect(s.units[victim].damage).toBe(2)
    // but being ATTACKED triggers the guard's influence
    const raider = put(s, p1, 'berserker', 2)
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'attack', attackers: [raider], target: { kind: 'unit', id: victim } })
    expect(influenceFor(s, p2)).toBe(1)                    // Sunguard defended → +1
  })

  it('influence win threshold ends the game', () => {
    let { s, p1, p2 } = arena()
    s.influence = p2 === 0 ? 13 : -13
    const detain = toHand(s, p2, 'detain')
    const target = put(s, p1, 'berserker', 1)
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: detain, targets: [{ kind: 'unit', id: target }] })
    // +1 (detain) → 14, not a win yet
    expect(s.winner).toBeNull()
    expect(influenceFor(s, p2)).toBe(14)
    const sanctify = toHand(s, p2, 'sanctify')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: sanctify })
    expect(s.winner).toBe(p2)
    expect(s.winReason).toBe('influence')
  })

  it('Radiant Citadel: opponent must reach 17', () => {
    let { s, p1, p2 } = arena()
    put(s, p1, 'radiant-citadel', homeZone(p1))          // p1 controls the citadel
    s.influence = p2 === 0 ? 15 : -15                    // would normally be a p2 win
    const bolt = toHand(s, p1, 'devastating-strike')
    const chump = put(s, p2, 'bulwark-protector', 1)
    s = act(s, p1, { type: 'play', card: bolt, targets: [{ kind: 'unit', id: chump }] })
    expect(s.winner).toBeNull()                          // 15 < 17 with citadel up
    s.influence = p2 === 0 ? 17 : -17
    s = act(s, p2, { type: 'pass' })
    expect(s.winner).toBe(p2)
  })
})

describe('prison', () => {
  it('imprisoned units release when the jailer dips below the threshold; decay charges each round', () => {
    let { s, p1, p2 } = arena()
    const jailerHand = toHand(s, p2, 'prison-warrant')
    const captive = put(s, p1, 'doombringer', 1)
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: jailerHand, targets: [{ kind: 'unit', id: captive }] })
    expect(s.units[captive].imprisoned?.by).toBe(p2)
    expect(influenceFor(s, p2)).toBe(1)
    // p2's next start step → decay −1 → back to 0 (≥ threshold 0, prison holds)
    s = toStartStepOf(s, p2)
    expect(influenceFor(s, p2)).toBe(0)
    expect(s.units[captive].imprisoned).toBeTruthy()
    // another round without income → second decay drops p2 to −1 → release
    s = toStartStepOf(s, p2)
    expect(influenceFor(s, p2)).toBe(-1)
    expect(s.units[captive].imprisoned).toBeNull()
  })

  it('unit-sourced prisons end when the source dies; Gateward Colossus pays on every imprisonment', () => {
    let { s, p1, p2 } = arena()
    put(s, p2, 'gateward-colossus', homeZone(p2))
    const priest = toHand(s, p2, 'containment-priest')
    const victim = put(s, p1, 'worldrender', homeZone(p2))
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: priest })
    // priest enters p2 home → auto-imprisons strongest enemy there (worldrender); colossus +1
    expect(s.units[victim].imprisoned?.by).toBe(p2)
    expect(influenceFor(s, p2)).toBe(1)
    // kill the priest → release
    const priestUnit = Object.values(s.units).find(u => u.slug === 'containment-priest')!
    const slam = toHand(s, p1, 'volcanic-slam')
    s = act(s, p1, { type: 'play', card: slam, targets: [{ kind: 'unit', id: priestUnit.id }] })
    expect(s.units[priestUnit.id]).toBeUndefined()
    expect(s.units[victim].imprisoned).toBeNull()
  })

  it('Radiant Judgment imprisons exactly the ≤3-power enemies', () => {
    let { s, p1, p2 } = arena()
    const small = put(s, p1, 'cinder-initiate', 1)   // 1 power
    const mid = put(s, p1, 'berserker', 0)           // 3 power
    const big = put(s, p1, 'worldrender', 2)         // 8 power
    const judgment = toHand(s, p2, 'radiant-judgment')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: judgment })
    expect(s.units[small].imprisoned).toBeTruthy()
    expect(s.units[mid].imprisoned).toBeTruthy()
    expect(s.units[big].imprisoned).toBeNull()
    expect(influenceFor(s, p2)).toBe(2)
  })

  it('start-of-round auto-imprisons: High Justiciar picks from another zone', () => {
    let { s, p1, p2 } = arena()
    put(s, p2, 'high-justiciar', homeZone(p2))
    const nearby = put(s, p1, 'berserker', homeZone(p2))   // same zone as justiciar — NOT eligible
    const afar = put(s, p1, 'doombringer', 1)              // other zone — eligible
    s = toStartStepOf(s, p2)                               // p2's start step → SOR fires
    expect(s.units[afar].imprisoned?.by).toBe(p2)
    expect(s.units[nearby].imprisoned).toBeNull()
  })
})

describe('auras and upgrades', () => {
  it('Warlord Garok pumps other friendlies; Hierophant only at 10+ influence', () => {
    let { s, p1, p2 } = arena()
    const grunt = put(s, p1, 'cinder-initiate', 1)         // 1 power
    put(s, p1, 'warlord-garok', 1)
    expect(effPower(s, s.units[grunt])).toBe(2)
    const hiero = put(s, p2, 'hierophant', 2)
    const wall = put(s, p2, 'bulwark-protector', 2)        // 2 power
    expect(effPower(s, s.units[wall])).toBe(2)             // influence < 10 → no buff
    s.influence = p2 === 0 ? 10 : -10
    expect(effPower(s, s.units[wall])).toBe(3)
    expect(effPower(s, s.units[hiero])).toBe(2)            // "other" excludes self
  })

  it('upgrades grant stats/keywords, pressure influence on the second, and die with Pillage', () => {
    let { s, p1, p2 } = arena()
    const knight = put(s, p2, 'exemplar-knight', 2)        // 4/4
    const oath = toHand(s, p2, 'oath-of-order')
    const iron = toHand(s, p2, 'iron-discipline')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: oath, targets: [{ kind: 'unit', id: knight }] })
    expect(effPower(s, s.units[knight])).toBe(5)
    expect(hasKw(s, s.units[knight], 'guard')).toBe(true)
    expect(influenceFor(s, p1)).toBe(0)                    // first upgrade: no pressure
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: iron, targets: [{ kind: 'unit', id: knight }] })
    // second upgrade: +1 influence to opponent (pressure), then card's own Influence +1 balances
    expect(influenceFor(s, p1)).toBe(1 - 1)
    expect(effArmor(s, s.units[knight])).toBe(1)
    const pillage = toHand(s, p1, 'pillage')
    const oathId = s.units[knight].upgrades[0]
    s = act(s, p1, { type: 'play', card: pillage, targets: [{ kind: 'upgrade', id: oathId }] })
    expect(effPower(s, s.units[knight])).toBe(4)           // oath gone with its buffs
    expect(s.units[knight].upgrades.length).toBe(1)
  })

  it('Chain of Law blocks enemy targeting but not your own', () => {
    let { s, p1, p2 } = arena()
    const wall = put(s, p2, 'bulwark-protector', 1)
    const chain = toHand(s, p2, 'chain-of-law')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: chain, targets: [{ kind: 'unit', id: wall }] })
    const bolt = toHand(s, p1, 'searing-bolt')
    expect(() => act(s, p1, { type: 'play', card: bolt, targets: [{ kind: 'unit', id: wall }] }))
      .toThrow(/targeted/i)
    // friendly heal still fine
    s.units[wall].damage = 2
    const faith = toHand(s, p2, 'unwavering-faith')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: faith, targets: [{ kind: 'unit', id: wall }] })
    expect(s.units[wall].damage).toBe(0)
  })
})

describe('tempo and timing', () => {
  it('this-round buffs expire at end of round (Blood Rush)', () => {
    let { s, p1 } = arena()
    const zerk = put(s, p1, 'berserker', 1)
    const rush = toHand(s, p1, 'blood-rush')
    s = act(s, p1, { type: 'play', card: rush, targets: [{ kind: 'unit', id: zerk }] })
    expect(effPower(s, s.units[zerk])).toBe(5)
    s = act(s, (1 - p1) as Seat, { type: 'pass' })
    s = act(s, p1, { type: 'pass' })                 // double pass → round ends, buffs expire
    expect(effPower(s, s.units[zerk])).toBe(3)
  })

  it('Unchained Rage doubles effective power', () => {
    let { s, p1 } = arena()
    const engine = put(s, p1, 'apocalypse-engine', 1)  // 7/7
    const rage = toHand(s, p1, 'unchained-rage')
    s = act(s, p1, { type: 'play', card: rage, targets: [{ kind: 'unit', id: engine }] })
    expect(effPower(s, s.units[engine])).toBe(14)
  })

  it('Relentless Assault readies for a second wave; Final Onslaught grants an extra action', () => {
    let { s, p1, p2 } = arena()
    const zerk = put(s, p1, 'berserker', 1, { exhausted: true })
    const assault = toHand(s, p1, 'relentless-assault')
    s = act(s, p1, { type: 'play', card: assault })
    expect(s.units[zerk].exhausted).toBe(false)
    const onslaught = toHand(s, p1, 'final-onslaught')
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'play', card: onslaught })
    expect(s.actorSeat).toBe(p1)              // extra action: window stays with p1
    expect(s.pendingExtraAction).toBeNull()
  })

  it('Devout Intervention absorbs base damage this round only', () => {
    let { s, p1, p2 } = arena()
    const ward = toHand(s, p2, 'devout-intervention')
    const sieger = put(s, p1, 'doombringer', homeZone(p2))
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: ward })
    s = act(s, p1, { type: 'attack', attackers: [sieger], target: { kind: 'base', seat: p2 } })
    expect(s.sides[p2].life).toBe(20 - (5 - 3))
  })

  it('Sanctify heal caps at starting life', () => {
    let { s, p1, p2 } = arena()
    s.sides[p2].life = 18
    const sanc = toHand(s, p2, 'sanctify')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: sanc })
    expect(s.sides[p2].life).toBe(20)
  })
})

describe('start-of-round engines', () => {
  it('Bloodfrenzy pumps only at ≤5 life; Censer trades influence for healing; Aura of Resolve pays out', () => {
    let { s, p1, p2 } = arena()
    const carrier = put(s, p1, 'berserker', 1)
    const frenzyCard = toHand(s, p1, 'bloodfrenzy')
    s = act(s, p1, { type: 'play', card: frenzyCard, targets: [{ kind: 'unit', id: carrier }] })
    put(s, p2, 'censer-of-purity', homeZone(p2))
    s.sides[p2].life = 15
    s.influence = p2 === 0 ? 3 : -3
    const resolveCarrier = put(s, p2, 'custodian-of-law', homeZone(p2))
    const resolve = toHand(s, p2, 'aura-of-resolve')
    // p2 attaches off-turn (frenzy play flipped the window to p2)
    s = act(s, p2, { type: 'play', card: resolve, targets: [{ kind: 'unit', id: resolveCarrier }] })
    // reach p2's start step: censer −1, aura +1 (net 0 vs 3), heal +2
    s = toStartStepOf(s, p2)
    expect(influenceFor(s, p2)).toBe(3)
    expect(s.sides[p2].life).toBe(17)
    // p1 at 20 life: frenzy silent. Drop p1 to 4 and reach p1's start step → frenzy fires
    s.sides[p1].life = 4
    const before = effPower(s, s.units[carrier])
    s = toStartStepOf(s, p1)
    expect(effPower(s, s.units[carrier])).toBe(before + 1)
  })
})

describe('base-assault splash (Crimson Behemoth, re-ruled playtest 004)', () => {
  it('splashes 2 onto every other unit in the defended home zone, both sides', () => {
    let { s, p1, p2 } = arena()
    const behemoth = put(s, p1, 'crimson-behemoth', homeZone(p2))
    const friendly = put(s, p1, 'cinder-initiate', homeZone(p2))     // 1/1 — collateral
    const defender = put(s, p2, 'hierophant', homeZone(p2))          // 2/6
    const bystander = put(s, p2, 'bulwark-protector', 1)             // neutral — untouched now
    s = act(s, p1, { type: 'attack', attackers: [behemoth], target: { kind: 'base', seat: p2 } })
    // hierophant is a ready defender in the home zone → decline the intercept so the base takes the hit
    if (s.phase === 'intercept') s = act(s, p2, { type: 'declineIntercept' })
    expect(s.sides[p2].life).toBe(20 - 6)
    expect(s.units[defender].damage).toBe(2)
    expect(s.units[friendly]).toBeUndefined()                        // own 1/1 died to the splash
    expect(s.units[bystander].damage).toBe(0)
    expect(s.units[behemoth].damage).toBe(0)                         // never splashes itself
  })
})

describe('zone-entry triggers on movement', () => {
  it('Containment Priest imprisons again when it marches into a new zone', () => {
    let { s, p1, p2 } = arena()
    const priest = put(s, p2, 'containment-priest', 1, { enteredRound: 0 })
    const victim = put(s, p1, 'berserker', 1)
    const target2 = put(s, p1, 'doombringer', homeZone(p1))
    s = act(s, p1, { type: 'pass' })          // hand the window to p2
    s = act(s, p2, { type: 'move', unit: priest, to: homeZone(p1) })
    // priest left neutral (victim there stays free) and imprisoned the strongest in p1 home
    expect(s.units[victim].imprisoned).toBeNull()
    expect(s.units[target2].imprisoned?.by).toBe(p2)
  })
})
