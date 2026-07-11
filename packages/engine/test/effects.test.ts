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
    // Bulwark Protector (2/5 guard): survives the bolt — Searing Bolt deals 3 since issue #4
    const victim = put(s, p2, 'bulwark-protector', 2)
    s = act(s, p1, { type: 'play', card: bolt, targets: [{ kind: 'unit', id: victim }] })
    expect(influenceFor(s, p2)).toBe(0)
    expect(s.units[victim].damage).toBe(3)
    // but being ATTACKED triggers the guard's influence
    const raider = put(s, p1, 'berserker', 2)
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'attack', attackers: [raider], target: { kind: 'unit', id: victim } })
    expect(influenceFor(s, p2)).toBe(1)                    // Bulwark defended → +1
  })

  it('influence win threshold ends the game', () => {
    let { s, p1, p2 } = arena()
    s.influence = p2 === 0 ? 13 : -13
    const detain = toHand(s, p2, 'detain')
    const warden = put(s, p2, 'bulwark-protector', 1)
    const target = put(s, p1, 'berserker', 1)
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: detain, targets: [{ kind: 'unit', id: warden }, { kind: 'unit', id: target }] })
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

describe('the capture era (v3 churn pass 3 — prison is gone from canon)', () => {
  it('Prison Warrant: a warden takes a small prisoner; the captive vanishes from play', () => {
    let { s, p1, p2 } = arena()
    const warden = put(s, p2, 'bulwark-protector', 1)
    const small = put(s, p1, 'flameblade-raider', 1)     // 2 power — inside the warrant's cap
    const warrant = toHand(s, p2, 'prison-warrant')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: warrant, targets: [{ kind: 'unit', id: warden }, { kind: 'unit', id: small }] })
    expect(s.units[small]).toBeUndefined()
    expect(s.captives[small]?.by).toBe(warden)
    expect(influenceFor(s, p2)).toBe(1)
  })

  it('Radiant Judgment exhausts exactly the ≤3-power enemies, everywhere', () => {
    let { s, p1, p2 } = arena()
    const small = put(s, p1, 'cinder-initiate', 1)   // 2 power (churned)
    const mid = put(s, p1, 'berserker', 0)           // 3 power
    const big = put(s, p1, 'worldrender', 2)         // 9 power (churned)
    const judgment = toHand(s, p2, 'radiant-judgment')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: judgment })
    expect(s.units[small].exhausted).toBe(true)
    expect(s.units[mid].exhausted).toBe(true)
    expect(s.units[big].exhausted).toBe(false)
    expect(influenceFor(s, p2)).toBe(2)
  })

  it('Absolution frees your captured units, dazed', () => {
    let { s, p1, p2 } = arena()
    const jailer = put(s, p1, 'bulwark-protector', 1)
    const mine = put(s, p2, 'berserker', 1)
    // p1 captures p2's berserker (test owns the setup)
    delete s.units[mine]
    s.captives[mine] = { unit: { id: mine, slug: 'berserker', owner: p2, zone: 1, damage: 0, exhausted: false, enteredRound: 0, movedThisRound: false, shielded: false, imprisoned: null, upgrades: [], mods: [], overextendedBy: 0 }, by: jailer }
    const hero = put(s, p2, 'sunguard-defender', 2)
    const abso = toHand(s, p2, 'absolution')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: abso, targets: [{ kind: 'unit', id: hero }] })
    expect(s.captives[mine]).toBeUndefined()
    expect(s.units[mine].exhausted).toBe(true)
  })

  it('Lawbringer stills a room every time it marches in', () => {
    let { s, p1, p2 } = arena()
    const victim = put(s, p1, 'berserker', 1)
    const law = toHand(s, p2, 'lawbringer')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: law, targets: [{ kind: 'unit', id: victim }] })
    // enters p2's home; targeted exhaust fires on the chosen enemy anywhere? — onEnterZone targets resolve at play
    expect(s.units[victim].exhausted).toBe(true)
  })
})

describe('auras and upgrades', () => {
  it('Warlord Garok pumps other friendlies; Hierophant only at 10+ influence', () => {
    let { s, p1, p2 } = arena()
    const grunt = put(s, p1, 'cinder-initiate', 1)         // 2 power since the v3 churn
    put(s, p1, 'warlord-garok', 1)
    expect(effPower(s, s.units[grunt])).toBe(3)
    const hiero = put(s, p2, 'hierophant', 2)
    const wall = put(s, p2, 'bulwark-protector', 2)        // 2 power
    expect(effPower(s, s.units[wall])).toBe(2)             // influence < 10 → no buff
    s.influence = p2 === 0 ? 10 : -10
    expect(effPower(s, s.units[wall])).toBe(3)
    expect(effPower(s, s.units[hiero])).toBe(3)            // "other" excludes self (3/7 since session 006)
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

  it('Chain of Law deputizes: attached unit gains Guard and Armor 1 (v3 churn)', () => {
    let { s, p1, p2 } = arena()
    const wearer = put(s, p2, 'berserker', 1)
    const chain = toHand(s, p2, 'chain-of-law')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: chain, targets: [{ kind: 'unit', id: wearer }] })
    expect(hasKw(s, s.units[wearer], 'guard')).toBe(true)
    expect(effArmor(s, s.units[wearer])).toBe(1)
    expect(influenceFor(s, p2)).toBe(1)
  })
})

describe('tempo and timing', () => {
  it('Blood Rush transfers the wound home (2026-07-11 rework, issue #4)', () => {
    let { s, p1 } = arena()
    const zerk = put(s, p1, 'berserker', 1, { damage: 2 })
    const rush = toHand(s, p1, 'blood-rush')
    const lifeBefore = s.sides[p1].life
    s = act(s, p1, { type: 'play', card: rush, targets: [{ kind: 'unit', id: zerk }] })
    expect(s.units[zerk].damage).toBe(0)
    expect(s.sides[p1].life).toBe(lifeBefore - 2)    // exactly the damage removed
  })

  it('Unchained Rage doubles ALL friendlies for two rounds (2026-07-11 rework, issue #4)', () => {
    let { s, p1 } = arena()
    const engine = put(s, p1, 'apocalypse-engine', 1)  // 8/7 since the v3 churn
    const zerk = put(s, p1, 'berserker', 2)            // 3/2
    const rage = toHand(s, p1, 'unchained-rage')
    s = act(s, p1, { type: 'play', card: rage })
    expect(effPower(s, s.units[engine])).toBe(16)
    expect(effPower(s, s.units[zerk])).toBe(6)
    s = act(s, (1 - p1) as Seat, { type: 'pass' })
    s = act(s, p1, { type: 'pass' })                   // round ends once: still doubled
    expect(effPower(s, s.units[engine])).toBe(16)
  })

  it('Relentless Assault readies all; Final Onslaught readies one unit + extra action (decision 43)', () => {
    let { s, p1, p2 } = arena()
    const zerk = put(s, p1, 'berserker', 1, { exhausted: true })
    const assault = toHand(s, p1, 'relentless-assault')
    s = act(s, p1, { type: 'play', card: assault })
    expect(s.units[zerk].exhausted).toBe(false)          // ready ALL friendly units
    // Final Onslaught: ready ONE chosen unit, then take an extra action
    const vet = put(s, p1, 'doombringer', 1, { exhausted: true })
    const onslaught = toHand(s, p1, 'final-onslaught')
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'play', card: onslaught, targets: [{ kind: 'unit', id: vet }] })
    expect(s.units[vet].exhausted).toBe(false)           // the chosen unit readied
    expect(s.actorSeat).toBe(p1)                         // extra action: window stays with p1
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
  it('Bloodfrenzy pumps only at ≤10 life; Censer trades influence for healing', () => {
    let { s, p1, p2 } = arena()
    const carrier = put(s, p1, 'berserker', 1)
    const frenzyCard = toHand(s, p1, 'bloodfrenzy')
    s = act(s, p1, { type: 'play', card: frenzyCard, targets: [{ kind: 'unit', id: carrier }] })
    put(s, p2, 'censer-of-purity', homeZone(p2))
    s.sides[p2].life = 15
    s.influence = p2 === 0 ? 3 : -3
    // reach p2's start step: censer −1 influence, heal +2 (Aura of Resolve no longer pays here — session 006)
    s = toStartStepOf(s, p2)
    expect(influenceFor(s, p2)).toBe(2)
    expect(s.sides[p2].life).toBe(17)
    // p1 at 20 life: frenzy silent. Drop p1 to 9 and reach p1's start step → frenzy fires (≤10 since session 006)
    s.sides[p1].life = 9
    const before = effPower(s, s.units[carrier])
    s = toStartStepOf(s, p1)
    expect(effPower(s, s.units[carrier])).toBe(before + 1)
  })

  it('Aura of Resolve pays when the wearer defends (session-006 redesign)', () => {
    let { s, p1, p2 } = arena()
    const raider = put(s, p1, 'flameblade-raider', homeZone(p2))
    const wearer = put(s, p2, 'custodian-of-law', homeZone(p2))
    const aura = toHand(s, p2, 'aura-of-resolve')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: aura, targets: [{ kind: 'unit', id: wearer }] })
    const before = influenceFor(s, p2)
    s = act(s, p1, { type: 'attack', attackers: [raider], target: { kind: 'unit', id: wearer } })
    if (s.phase === 'intercept') s = act(s, p2, { type: 'declineIntercept' })
    // custodian's own onDefend (+2) plus the aura's onDefend (+2)
    expect(influenceFor(s, p2)).toBe(before + 4)
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
  it('Containment Priest captures a small enemy on entry (v3 churn)', () => {
    let { s, p1, p2 } = arena()
    const small = put(s, p1, 'flameblade-raider', homeZone(p2))   // 2 power
    const priest = toHand(s, p2, 'containment-priest')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: priest, targets: [{ kind: 'unit', id: small }] })
    expect(s.units[small]).toBeUndefined()
    const priestUnit = Object.values(s.units).find(u => u.slug === 'containment-priest')!
    expect(s.captives[small]?.by).toBe(priestUnit.id)
  })
})
