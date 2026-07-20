import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { createGame } from '../src/setup.ts'
import { DEFAULT_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { effPower, effArmor, influenceFor, hasKw } from '../src/helpers.ts'
import { destroyUnit } from '../src/effects.ts'
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
    // Bulwark Protector (2/2 guard, Armor 1 since #77): survives the bolt — Searing Bolt's 2 is reduced to 1 by armor.
    // The duel lives in the NEUTRAL zone so no home-zone ally can open an intercept window
    // (deck sizes shift the seeded initiative — issue #30 made red 49 cards).
    const victim = put(s, p2, 'bulwark-protector', 1)
    s = act(s, p1, { type: 'play', card: bolt, targets: [{ kind: 'unit', id: victim }] })
    expect(influenceFor(s, p2)).toBe(0)
    expect(s.units[victim].damage).toBe(1)                 // Armor 1 (#77) reduces the bolt's 2 to 1; still survives
    // but being ATTACKED triggers the guard's influence
    const raider = put(s, p1, 'berserker', 1)
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'attack', attackers: [raider], target: { kind: 'unit', id: victim } })
    expect(influenceFor(s, p2)).toBe(1)                    // Bulwark defended → +1 (issue #55: ladder pulled back)
  })

  it('influence win threshold ends the game', () => {
    let { s, p1, p2 } = arena()
    s.influence = p2 === 0 ? 19 : -19                      // one below the ±20 win threshold (#91)
    const detain = toHand(s, p2, 'detain')
    const warden = put(s, p2, 'bulwark-protector', 1)
    const target = put(s, p1, 'berserker', 1)
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: detain, targets: [{ kind: 'unit', id: warden }, { kind: 'unit', id: target }] })
    // issue #55: Detain's flat rider is cut — the capture pays nothing; still 19, not a win
    expect(s.winner).toBeNull()
    expect(influenceFor(s, p2)).toBe(19)
    const sanctify = toHand(s, p2, 'sanctify')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: sanctify })
    expect(s.winner).toBe(p2)
    expect(s.winReason).toBe('influence')
  })

  it('#74: effect damage from a played card names the card as its source', () => {
    // Griff (#74): the AI-turn pop-up "doesn't mention where the damage comes from."
    // The recap renders the log's damage line verbatim — so the line itself must name the card.
    let { s, p1, p2 } = arena()
    const bolt = toHand(s, p1, 'searing-bolt')
    const victim = put(s, p2, 'bulwark-protector', 1)     // 2/2 Armor 1 — takes 1, survives, logs the hit
    const { events } = applyAction(s, { type: 'play', card: bolt, targets: [{ kind: 'unit', id: victim }] }, p1)
    expect(events.some(e => /takes \d+ damage from Searing Bolt/.test(e.msg))).toBe(true)
  })

  // Radiant Citadel's oppThreshold static is gone (#69): the card became yellow's summoning
  // wall — behavior pinned in create-units.test.ts, including "the threshold no longer moves".
})

describe('the capture era (v3 churn pass 3 — prison is gone from canon)', () => {
  it('Prison Warrant: a warden takes a small prisoner; the captive vanishes from play', () => {
    let { s, p1, p2 } = arena()
    const warden = put(s, p2, 'bulwark-protector', 1)
    const small = put(s, p1, 'spark-hound', 1)     // 2 power — inside the warrant's cap (raider is 4/1 since PR #33)
    const warrant = toHand(s, p2, 'prison-warrant')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: warrant, targets: [{ kind: 'unit', id: warden }, { kind: 'unit', id: small }] })
    expect(s.units[small]).toBeUndefined()
    expect(s.captives[small]?.by).toBe(warden)
    expect(influenceFor(s, p2)).toBe(0)                    // PR #53: the flat gain became income —
    expect(s.captives[small]?.income).toBe(1)              // 1/round while the warrant holds
  })

  it('Radiant Judgment: +1 lands first, then exhausts every enemy whose cost ≤ the NEW influence', () => {
    let { s, p1, p2 } = arena()
    s.influence = p2 === 0 ? 3 : -3                   // p2 sits at 3 → 4 after the rider
    const cheap = put(s, p1, 'cinder-initiate', 1)   // cost 1 → exhausted
    const four = put(s, p1, 'exemplar-knight', 1)    // cost 4 → exhausted ONLY because the +1 ran first (4 > 3, ≤ 4)
    const five = put(s, p1, 'custodian-of-law', 1)   // cost 5 → safe
    const judgment = toHand(s, p2, 'radiant-judgment')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: judgment })
    expect(s.units[cheap].exhausted).toBe(true)
    expect(s.units[four].exhausted).toBe(true)
    expect(s.units[five].exhausted).toBe(false)
    expect(influenceFor(s, p2)).toBe(4)              // 3 + 1; the below-1 comeback stays silent above 0
  })

  it('Absolution frees your captured units, ready (decision 73)', () => {
    let { s, p1, p2 } = arena()
    const jailer = put(s, p1, 'bulwark-protector', 1)
    const mine = put(s, p2, 'berserker', 1)
    // p1 captures p2's berserker (test owns the setup)
    delete s.units[mine]
    s.captives[mine] = { unit: { id: mine, slug: 'berserker', owner: p2, zone: 1, damage: 0, exhausted: false, enteredRound: 0, movedThisRound: false, shielded: false, upgrades: [], mods: [], overextendedBy: 0 }, by: jailer }
    const hero = put(s, p2, 'sunguard-defender', 2)
    const abso = toHand(s, p2, 'absolution')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: abso, targets: [{ kind: 'unit', id: hero }] })
    expect(s.captives[mine]).toBeUndefined()
    expect(s.units[mine].exhausted).toBe(false)
  })

  // #104 (Griff): Lawbringer arrests an enemy IN THE ZONE IT ENTERS — but now the CONTROLLER CHOOSES
  // which one (a decision like Capture's target), on play AND on every subsequent march. Still no
  // cross-zone reach; still mandatory when an enemy is available (you pick WHICH, not WHETHER).
  describe('Lawbringer — the player chooses the arrest in the entered zone', () => {
    it('on play, stands down the CHOSEN enemy — not the strongest', () => {
      let { s, p1, p2 } = arena()
      const strong = put(s, p1, 'cinder-initiate', homeZone(p2))  // power 2 — the old auto-pick's target
      const weak = put(s, p1, 'berserker', homeZone(p2))          // power 1 — the player picks THIS one
      const law = toHand(s, p2, 'lawbringer')
      s = act(s, p1, { type: 'pass' })
      s = act(s, p2, { type: 'play', card: law, exhaust: weak })  // Lawbringer enters p2's Home, arrests the weaker
      expect(s.units[weak].exhausted).toBe(true)                  // the chosen enemy is stood down
      expect(s.units[strong].exhausted).toBe(false)              // the stronger one is left standing
    })

    it('an enemy in another zone is never a legal choice', () => {
      let { s, p1, p2 } = arena()
      const homeEnemy = put(s, p1, 'cinder-initiate', homeZone(p2))  // same zone as the entry
      const farEnemy = put(s, p1, 'berserker', 1)                    // Neutral — a different zone
      const law = toHand(s, p2, 'lawbringer')
      s = act(s, p1, { type: 'pass' })
      // choosing the far enemy is rejected; choosing the room's enemy is the only legal arrest
      expect(() => act(s, p2, { type: 'play', card: law, exhaust: farEnemy })).toThrow()
      s = act(s, p2, { type: 'play', card: law, exhaust: homeEnemy })
      expect(s.units[homeEnemy].exhausted).toBe(true)
      expect(s.units[farEnemy].exhausted).toBe(false)
    })

    it('on march, arrests the CHOSEN enemy in the destination zone', () => {
      let { s, p1, p2 } = arena()
      const law = put(s, p2, 'lawbringer', homeZone(p2), { enteredRound: 0 })  // already deployed, free to move
      const strongNeutral = put(s, p1, 'cinder-initiate', 1)         // power 2, waiting in Neutral
      const weakNeutral = put(s, p1, 'berserker', 1)                 // power 1, waiting in Neutral
      const frontEnemy = put(s, p1, 'spark-hound', homeZone(p1))     // a different zone — never a choice here
      s = act(s, p1, { type: 'pass' })
      // the far enemy in p1's Home is not a legal target for a march into Neutral
      expect(() => act(s, p2, { type: 'move', unit: law, to: 1, exhaust: frontEnemy })).toThrow()
      s = act(s, p2, { type: 'move', unit: law, to: 1, exhaust: weakNeutral })  // march into Neutral, arrest the chosen
      expect(s.units[weakNeutral].exhausted).toBe(true)
      expect(s.units[strongNeutral].exhausted).toBe(false)
      expect(s.units[frontEnemy].exhausted).toBe(false)
    })

    it('the arrest is mandatory when an enemy is available — a targetless play is rejected', () => {
      let { s, p1, p2 } = arena()
      put(s, p1, 'berserker', homeZone(p2))                  // an eligible enemy shares the deploy zone
      const law = toHand(s, p2, 'lawbringer')
      s = act(s, p1, { type: 'pass' })
      expect(() => act(s, p2, { type: 'play', card: law })).toThrow()  // must choose WHICH, not skip
    })

    it('does nothing when only friendlies share the entered zone — plays with no arrest', () => {
      let { s, p1, p2 } = arena()
      const friendly = put(s, p2, 'berserker', homeZone(p2))  // Lawbringer's own unit — never a target
      const law = toHand(s, p2, 'lawbringer')
      s = act(s, p1, { type: 'pass' })
      s = act(s, p2, { type: 'play', card: law })            // no ENEMY present → a plain play, no arrest
      expect(s.units[friendly].exhausted).toBe(false)        // friendlies are never arrested
      expect(s.winner).toBeNull()                            // and nothing crashes
    })

    it('an already-exhausted enemy is not a legal arrest — a wasted arrest is no choice', () => {
      let { s, p1, p2 } = arena()
      const down = put(s, p1, 'cinder-initiate', homeZone(p2), { exhausted: true })  // already down
      const law = toHand(s, p2, 'lawbringer')
      s = act(s, p1, { type: 'pass' })
      // the only enemy is already exhausted → no eligible target → a plain play; naming it is rejected
      expect(() => act(s, p2, { type: 'play', card: law, exhaust: down })).toThrow()
      s = act(s, p2, { type: 'play', card: law })
      expect(s.units[down].exhausted).toBe(true)             // (unchanged — it was already exhausted)
    })
  })
})

describe('auras and upgrades', () => {
  it('Warlord Garok pumps other friendlies; Hierophant only while Influence is positive', () => {
    let { s, p1, p2 } = arena()
    const grunt = put(s, p1, 'cinder-initiate', 1)         // 2 power since the v3 churn
    put(s, p1, 'warlord-garok', 1)
    expect(effPower(s, s.units[grunt])).toBe(3)
    const hiero = put(s, p2, 'hierophant', 2)
    const wall = put(s, p2, 'bulwark-protector', 2)        // 2 power
    expect(effPower(s, s.units[wall])).toBe(2)             // influence 0 → not positive → no buff
    s.influence = p2 === 0 ? 1 : -1                        // p2 to +1: the new positive threshold (#73)
    expect(effPower(s, s.units[wall])).toBe(3)
    expect(effPower(s, s.units[hiero])).toBe(1)            // "other" excludes self (1/6 since the #107 pass)
  })

  it('upgrades grant stats/keywords, pressure influence on the second, and die with Pillage', () => {
    let { s, p1, p2 } = arena()
    const knight = put(s, p2, 'exemplar-knight', 2)        // 4/4
    const oath = toHand(s, p2, 'oath-of-order')
    const iron = toHand(s, p2, 'iron-discipline')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: oath, targets: [{ kind: 'unit', id: knight }] })
    expect(effPower(s, s.units[knight])).toBe(4)          // PR #52: Oath's +1 Power rider is cut — Guard only
    expect(hasKw(s, s.units[knight], 'guard')).toBe(true)
    expect(influenceFor(s, p1)).toBe(0)                    // first upgrade: no pressure
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: iron, targets: [{ kind: 'unit', id: knight }] })
    // second upgrade: +1 influence to opponent (pressure), then card's own Influence +1 balances
    expect(influenceFor(s, p1)).toBe(1)   // PR #51: Iron Plating lost its own influence rider — pressure alone remains
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
    const zerk = put(s, p1, 'berserker', 2)            // 1/4 since PR #32 (stats to favor Scar)
    const rage = toHand(s, p1, 'unchained-rage')
    s = act(s, p1, { type: 'play', card: rage })
    expect(effPower(s, s.units[engine])).toBe(16)
    expect(effPower(s, s.units[zerk])).toBe(2)
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
    const vet = put(s, p1, 'blaze-juggernaut', 1, { exhausted: true })
    const onslaught = toHand(s, p1, 'final-onslaught')
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'play', card: onslaught, targets: [{ kind: 'unit', id: vet }] })
    expect(s.units[vet].exhausted).toBe(false)           // the chosen unit readied
    expect(s.actorSeat).toBe(p1)                         // extra action: window stays with p1
    expect(s.pendingExtraAction).toBeNull()
  })

  it('Devout Intervention: the Home ward fully turns aside the next attack, then is spent', () => {
    let { s, p1, p2 } = arena()
    const ward = toHand(s, p2, 'devout-intervention')
    const sieger = put(s, p1, 'blaze-juggernaut', homeZone(p2))   // 5/5, would deal 5 to the base
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: ward })
    expect(s.homeWard[p2]).toBe(true)
    s = act(s, p1, { type: 'attack', attackers: [sieger], target: { kind: 'base', seat: p2 } })
    if (s.phase === 'intercept') s = act(s, p2, { type: 'declineIntercept' })
    expect(s.sides[p2].life).toBe(20)          // the whole assault is warded — not just 3
    expect(s.homeWard[p2]).toBe(false)         // a real prevention spends the ward
  })

  it('Sanctify overheals past starting life (decision 104: no life cap)', () => {
    let { s, p1, p2 } = arena()
    s.sides[p2].life = 18
    const sanc = toHand(s, p2, 'sanctify')                 // heals 4
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: sanc })
    expect(s.sides[p2].life).toBe(22)                      // 18 + 4, uncapped (was clamped to 20)
  })
})

describe('start-of-round engines', () => {
  // NOTE (#107 balance pass, phase 2): Bloodfrenzy's ≤10-life start-of-round pump was reworked
  // into an Influence-conditional attached aura — see bloodfrenzy.test.ts. And #104 stripped
  // Censer of Purity's start-step engine entirely — "change text" replaced the old "lose 1
  // Influence, heal 2 from your base" with an activated move-damage ability (see censer.test.ts).
  // The only start-of-round engine still exercised below is Aura of Resolve.
  it('Censer of Purity no longer runs a start-of-round engine (#104: "change text")', () => {
    let { s, p1, p2 } = arena()
    put(s, p2, 'censer-of-purity', homeZone(p2))
    s.sides[p2].life = 15
    s.influence = p2 === 0 ? 3 : -3
    s = toStartStepOf(s, p2)
    expect(influenceFor(s, p2)).toBe(3)   // no −1 influence bleed anymore
    expect(s.sides[p2].life).toBe(15)     // no +2 base heal anymore
  })

  it('Aura of Resolve: +2 Life per friendly death, opponent -2 per enemy death (this round)', () => {
    let { s, p1, p2 } = arena()
    const friend1 = put(s, p2, 'cinder-initiate', 1)
    const friend2 = put(s, p2, 'spark-hound', 1)
    const foe = put(s, p1, 'berserker', 1)
    destroyUnit(s, s.units[friend1], 'test')
    destroyUnit(s, s.units[friend2], 'test')
    destroyUnit(s, s.units[foe], 'test')
    expect(s.deaths[p2]).toBe(2)               // ledger, by owner side
    expect(s.deaths[p1]).toBe(1)
    const meLife = s.sides[p2].life, themLife = s.sides[p1].life
    const aura = toHand(s, p2, 'aura-of-resolve')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: aura })
    expect(s.sides[p2].life).toBe(meLife + 4)   // 2 friendly deaths × 2
    expect(s.sides[p1].life).toBe(themLife - 2) // 1 enemy death × 2 (ordinary base damage)
  })
})

describe('on-attack zone splash (Crimson Behemoth, #107)', () => {
  it('splashes 2 onto every other unit in its zone, both sides, and pays 1 per collateral kill', () => {
    let { s, p1, p2 } = arena()
    const behemoth = put(s, p1, 'crimson-behemoth', homeZone(p2))
    const friendly = put(s, p1, 'cinder-initiate', homeZone(p2))     // 2/1 — own collateral, dies
    const defender = put(s, p2, 'hierophant', homeZone(p2))          // 2/6 — survives the 2
    const bystander = put(s, p2, 'bulwark-protector', 1)             // neutral — zone-scoped, untouched
    const before = influenceFor(s, p1)
    // the splash now fires on the attack DECLARATION (onAttack), before the intercept window
    s = act(s, p1, { type: 'attack', attackers: [behemoth], target: { kind: 'base', seat: p2 } })
    if (s.phase === 'intercept') s = act(s, p2, { type: 'declineIntercept' })
    expect(s.sides[p2].life).toBe(20 - 6)
    expect(s.units[defender].damage).toBe(2)
    expect(s.units[friendly]).toBeUndefined()                        // own 2/1 died to the splash
    expect(s.units[bystander].damage).toBe(0)
    expect(s.units[behemoth].damage).toBe(0)                         // never splashes itself
    expect(influenceFor(s, p1) - before).toBe(1)                     // +1 for felling its own collateral (#107)
  })
})

describe('zone-entry triggers on movement', () => {
  it('Containment Priest mode 0: captures a small enemy on entry (v3 churn; #75 modal)', () => {
    let { s, p1, p2 } = arena()
    const small = put(s, p1, 'spark-hound', homeZone(p2))   // 2 power (raider is 4/1 since PR #33)
    const priest = toHand(s, p2, 'containment-priest')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: priest, targets: [{ kind: 'unit', id: small }], mode: 0 })
    expect(s.units[small]).toBeUndefined()
    const priestUnit = Object.values(s.units).find(u => u.slug === 'containment-priest')!
    expect(s.captives[small]?.by).toBe(priestUnit.id)
  })

  it('Containment Priest mode 1 (#75): exhausts a DAMAGED enemy — and never captures it', () => {
    let { s, p1, p2 } = arena()
    const wounded = put(s, p1, 'berserker', homeZone(p2), { damage: 1 })  // a damaged enemy
    const priest = toHand(s, p2, 'containment-priest')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: priest, targets: [{ kind: 'unit', id: wounded }], mode: 1 })
    expect(s.units[wounded].exhausted).toBe(true)      // stood down
    expect(s.captives[wounded]).toBeUndefined()        // mode 1 exhausts, it does not capture
    expect(s.units[wounded]).toBeDefined()             // still on the board
  })

  it('Containment Priest mode 1 (#75): rejects an UNdamaged target (mustBeDamaged)', () => {
    let { s, p1, p2 } = arena()
    const healthy = put(s, p1, 'berserker', homeZone(p2))  // full health — illegal for mode 1
    const priest = toHand(s, p2, 'containment-priest')
    s = act(s, p1, { type: 'pass' })
    expect(() => act(s, p2, { type: 'play', card: priest, targets: [{ kind: 'unit', id: healthy }], mode: 1 }))
      .toThrow(/damaged/)
  })
})
