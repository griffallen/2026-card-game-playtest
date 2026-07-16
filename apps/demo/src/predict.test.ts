import { describe, expect, it } from 'vitest'
import { predictCombat, type PredictUnit } from './predict.ts'

// Minimal unit builder — only the fields the predictor reads. Defaults are a vanilla melee body.
const u = (over: Partial<PredictUnit> & { id: string; name: string; power: number; health: number }): PredictUnit => ({
  damage: 0, armor: 0, shielded: false, keywords: [], zone: 1, owner: 1, ...over,
})

describe('predictCombat — unit target', () => {
  it('narrates a lone duel where the attacker falls (deals through, dies to the counter)', () => {
    const berserker = u({ id: 'u1', name: 'Berserker', power: 3, health: 4, owner: 0 })
    const citadel = u({ id: 'u2', name: 'Radiant Citadel', power: 5, health: 6 })
    const p = predictCombat([berserker], { kind: 'unit', unit: citadel })
    expect(p.attackerPower).toBe(3)
    expect(p.landed).toBe(3)
    expect(p.targetFalls).toBe(false)
    expect(p.targetRemaining).toBe(3)
    expect(p.retaliation).toBe(5) // the counter POOL is 5 (the target's Power)…
    // …but the engine caps each attacker's marked damage at what fells it (health 4 + armor 0),
    // so Berserker takes 4 and dies; the extra point of the pool is wasted (no other attacker).
    expect(p.attackers[0]).toMatchObject({ taken: 4, falls: true, shieldHeld: false })
    expect(p.anyAttackerFalls).toBe(true)
  })

  it('subtracts the target armor from what lands', () => {
    const raider = u({ id: 'u1', name: 'Raider', power: 3, health: 3, owner: 0 })
    const wall = u({ id: 'u2', name: 'Wall', power: 1, health: 5, armor: 2 })
    const p = predictCombat([raider], { kind: 'unit', unit: wall })
    expect(p.landed).toBe(1) // 3 power - 2 armor
    expect(p.targetFalls).toBe(false)
    expect(p.attackers[0].taken).toBe(1) // counter 1, no attacker armor
    expect(p.attackers[0].falls).toBe(false)
  })

  it("a target's shield eats the whole blow and no damage lands", () => {
    const lancer = u({ id: 'u1', name: 'Lancer', power: 4, health: 4, owner: 0 })
    const warden = u({ id: 'u2', name: 'Warden', power: 2, health: 3, shielded: true })
    const p = predictCombat([lancer], { kind: 'unit', unit: warden })
    expect(p.landed).toBe(0)
    expect(p.targetShielded).toBe(true)
    expect(p.targetFalls).toBe(false)
    expect(p.attackers[0].taken).toBe(2) // the shield does not stop the counter
  })

  it("an attacker's own shield absorbs the counter but still spends against the pool", () => {
    const knight = u({ id: 'u1', name: 'Knight', power: 4, health: 4, shielded: true, owner: 0 })
    const ogre = u({ id: 'u2', name: 'Ogre', power: 6, health: 6 })
    const p = predictCombat([knight], { kind: 'unit', unit: ogre })
    expect(p.attackers[0]).toMatchObject({ taken: 0, shieldHeld: true, falls: false })
  })

  it('shrugs off a counter fully soaked by armor', () => {
    const veteran = u({ id: 'u1', name: 'Veteran', power: 3, health: 3, armor: 3, owner: 0 })
    const grunt = u({ id: 'u2', name: 'Grunt', power: 2, health: 2 })
    const p = predictCombat([veteran], { kind: 'unit', unit: grunt })
    expect(p.attackers[0].taken).toBe(0) // counter 2 - armor 3 = 0
    expect(p.attackers[0].falls).toBe(false)
  })

  it('divides a gang counter highest-power-first — the strong one soaks it, the weak survives', () => {
    // Citadel counters for 5. Poured highest-power first: Berserker(3) soaks 3 (dies, health 3),
    // remaining 2 pours to Squire(1) which has health 2 -> takes 2, dies too. Change health so the
    // pool runs dry: give Squire health 4 so it takes 2 and holds.
    const berserker = u({ id: 'u2', name: 'Berserker', power: 3, health: 3, owner: 0 })
    const squire = u({ id: 'u5', name: 'Squire', power: 1, health: 4, owner: 0 })
    const citadel = u({ id: 'u9', name: 'Radiant Citadel', power: 5, health: 20 })
    const p = predictCombat([berserker, squire], { kind: 'unit', unit: citadel })
    expect(p.attackerPower).toBe(4)
    expect(p.landed).toBe(4)
    const bers = p.attackers.find(a => a.name === 'Berserker')!
    const sq = p.attackers.find(a => a.name === 'Squire')!
    expect(bers).toMatchObject({ taken: 3, falls: true }) // soaks its full health
    expect(sq).toMatchObject({ taken: 2, falls: false }) // remaining pool 2, health 4
    expect(p.anyAttackerFalls).toBe(true)
  })

  it('a gang can fell the target with combined power', () => {
    const a1 = u({ id: 'u1', name: 'A', power: 3, health: 3, owner: 0 })
    const a2 = u({ id: 'u2', name: 'B', power: 3, health: 3, owner: 0 })
    const wall = u({ id: 'u3', name: 'Wall', power: 0, health: 5, armor: 1 })
    const p = predictCombat([a1, a2], { kind: 'unit', unit: wall })
    expect(p.landed).toBe(5) // 6 combined - 1 armor
    expect(p.targetFalls).toBe(true)
    expect(p.retaliation).toBe(0)
    expect(p.anyAttackerFalls).toBe(false)
  })

  it('flags a Breakthrough attacker and a siege on the target home zone', () => {
    const ram = u({ id: 'u1', name: 'Battering Ram', power: 5, health: 3, keywords: ['breakthrough'], owner: 0 })
    const homeGuard = u({ id: 'u2', name: 'Home Guard', power: 2, health: 3, zone: 2, owner: 1 })
    const p = predictCombat([ram], { kind: 'unit', unit: homeGuard })
    expect(p.hasBreakthrough).toBe(true)
    expect(p.siege).toBe(true) // target sits in seat 1's home (zone 2)
  })

  it('respects a rules set with no retaliation', () => {
    const a1 = u({ id: 'u1', name: 'A', power: 3, health: 3, owner: 0 })
    const t = u({ id: 'u2', name: 'T', power: 5, health: 6 })
    const p = predictCombat([a1], { kind: 'unit', unit: t }, false)
    expect(p.retaliation).toBe(0)
    expect(p.attackers[0].taken).toBe(0)
  })
})

describe('predictCombat — base target', () => {
  it('deals combined power and the base does not strike back', () => {
    const a1 = u({ id: 'u1', name: 'Raider', power: 4, health: 3, owner: 0 })
    const p = predictCombat([a1], { kind: 'base', name: 'Crimson', life: 20 })
    expect(p.kind).toBe('base')
    expect(p.attackerPower).toBe(4)
    expect(p.baseLifeBefore).toBe(20)
    expect(p.baseLifeAfter).toBe(16)
    expect(p.anyAttackerFalls).toBe(false)
    expect(p.attackers.every(o => o.taken === 0)).toBe(true)
  })
})
