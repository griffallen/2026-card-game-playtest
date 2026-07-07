import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { createGame } from '../src/setup.ts'
import { DEFAULT_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { effPower, effArmor, influenceFor, hasKw } from '../src/helpers.ts'
import { homeZone } from '../src/types.ts'
import type { GameState, Seat } from '../src/types.ts'
import { fuel, put, toHand } from './util.ts'

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

/** Real-cards game advanced into p1's main phase, with plenty of fuel. */
function arena(seed = 11) {
  let s = createGame({
    seed,
    rules: DEFAULT_RULES,
    cardSet: CARD_SET,
    players: [
      { name: 'Ada', deck: deckSlugs(PREBUILT_DECKS[0]) },
      { name: 'Bo', deck: deckSlugs(PREBUILT_DECKS[1]) },
    ],
  })
  const p1 = s.activeSeat
  const p2 = (1 - p1) as Seat
  fuel(s, p1, 20)
  fuel(s, p2, 20)
  s = act(s, p1, { type: 'skipResource' })
  return { s, p1, p2 }
}

describe('influence effects', () => {
  it('yellow guard grants +1 influence on entry; red overextend action cedes it', () => {
    let { s, p1, p2 } = arena()
    const sentinel = toHand(s, p2, 'vanguard-sentinel')
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: sentinel })
    expect(influenceFor(s, p2)).toBe(1)
    const bolt = toHand(s, p1, 'searing-bolt')
    const victim = put(s, p2, 'sunguard-defender', 2)
    s = act(s, p1, { type: 'play', card: bolt, targets: [{ kind: 'unit', id: victim }] })
    // bolt: 2 damage + overextend 1 → p1 cedes 1 → p2 now at 2
    expect(influenceFor(s, p2)).toBe(2)
    expect(s.units[victim].damage).toBe(2)
  })

  it('influence win threshold ends the game — and Radiant Citadel raises the bar to 17', () => {
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
  it('imprisoned units release when the jailer dips below the threshold; decay charges each turn', () => {
    let { s, p1, p2 } = arena()
    const jailerHand = toHand(s, p2, 'prison-warrant')
    const captive = put(s, p1, 'doombringer', 1)
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: jailerHand, targets: [{ kind: 'unit', id: captive }] })
    expect(s.units[captive].imprisoned?.by).toBe(p2)
    expect(influenceFor(s, p2)).toBe(1)
    // pass to p2's turn start → decay −1 → back to 0 (≥ threshold 0, prison holds)
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'pass' })       // turn ends → p2's turn starts, decay fires
    expect(influenceFor(s, p2)).toBe(0)
    expect(s.units[captive].imprisoned).toBeTruthy()
    // another full round without influence income → second decay drops p2 to −1 → release
    s = act(s, p2, { type: 'skipResource' })
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'pass' })       // → p1's turn (no decay for p1)
    s = act(s, p1, { type: 'skipResource' })
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'pass' })       // → p2's turn again, decay fires below threshold
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

  it('start-of-turn auto-imprisons: High Justiciar picks from another zone', () => {
    let { s, p1, p2 } = arena()
    put(s, p2, 'high-justiciar', homeZone(p2))
    const nearby = put(s, p1, 'berserker', homeZone(p2))   // same zone as justiciar — NOT eligible
    const afar = put(s, p1, 'doombringer', 1)              // other zone — eligible
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'pass' })                       // turn passes to p2 → SOT fires
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
  it('this-turn buffs expire at end of turn (Blood Rush)', () => {
    let { s, p1 } = arena()
    const zerk = put(s, p1, 'berserker', 1)
    const rush = toHand(s, p1, 'blood-rush')
    s = act(s, p1, { type: 'play', card: rush, targets: [{ kind: 'unit', id: zerk }] })
    expect(effPower(s, s.units[zerk])).toBe(5)
    s = act(s, (1 - p1) as Seat, { type: 'pass' })
    s = act(s, p1, { type: 'pass' })                 // double pass → turn ends, buffs expire
    expect(effPower(s, s.units[zerk])).toBe(3)
  })

  it('Unchained Rage doubles effective power', () => {
    let { s, p1 } = arena()
    const engine = put(s, p1, 'apocalypse-engine', 1)  // 7/7
    const rage = toHand(s, p1, 'unchained-rage')
    s = act(s, p1, { type: 'play', card: rage, targets: [{ kind: 'unit', id: engine }] })
    expect(effPower(s, s.units[engine])).toBe(14)
  })

  it('Relentless Assault readies for a second wave; Final Onslaught grants an extra turn', () => {
    let { s, p1, p2 } = arena()
    const zerk = put(s, p1, 'berserker', 1, { exhausted: true })
    const assault = toHand(s, p1, 'relentless-assault')
    s = act(s, p1, { type: 'play', card: assault })
    expect(s.units[zerk].exhausted).toBe(false)
    const onslaught = toHand(s, p1, 'final-onslaught')
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'play', card: onslaught })
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'pass' })          // turn ends…
    expect(s.activeSeat).toBe(p1)             // …but p1 goes again
    expect(s.turn).toBe(2)
  })

  it('Devout Intervention absorbs base damage this turn only', () => {
    let { s, p1, p2 } = arena()
    const ward = toHand(s, p2, 'devout-intervention')
    const sieger = put(s, p1, 'doombringer', homeZone(p2))
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'play', card: ward })
    s = act(s, p1, { type: 'attack', attacker: sieger, target: { kind: 'base', seat: p2 } })
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

describe('start-of-turn engines', () => {
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
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'pass' })
    // p2's turn started: censer −1, aura +1 (net 0 vs 3), heal +2
    expect(influenceFor(s, p2)).toBe(3)
    expect(s.sides[p2].life).toBe(17)
    // p1 at 20 life: frenzy silent. Drop p1 to 4 and cycle to p1's turn.
    s.sides[p1].life = 4
    const before = effPower(s, s.units[carrier])
    s = act(s, p2, { type: 'skipResource' })
    s = act(s, p2, { type: 'pass' })
    s = act(s, p1, { type: 'pass' })          // p1's turn starts → frenzy fires
    expect(effPower(s, s.units[carrier])).toBe(before + 1)
  })
})

describe('zone-entry triggers on movement', () => {
  it('Containment Priest imprisons again when it marches into a new zone', () => {
    let { s, p1, p2 } = arena()
    const priest = put(s, p2, 'containment-priest', 1, { enteredTurn: 0 })
    const victim = put(s, p1, 'berserker', 1)
    // p2 isn't active; hand the turn over first
    s = act(s, p1, { type: 'pass' })
    s = act(s, p2, { type: 'pass' })          // now p2's turn
    s = act(s, p2, { type: 'skipResource' })
    const target2 = put(s, p1, 'doombringer', homeZone(p1))
    s = act(s, p2, { type: 'move', unit: priest, to: homeZone(p1) })
    // priest left neutral (victim there stays free) and imprisoned the strongest in p1 home
    expect(s.units[victim].imprisoned).toBeNull()
    expect(s.units[target2].imprisoned?.by).toBe(p2)
  })
})
