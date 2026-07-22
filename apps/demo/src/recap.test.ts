import { describe, expect, it } from 'vitest'
import type { GameAction, GameState, TargetRef } from '@newgame/engine'
import { composeCombatRecap } from './recap.ts'

// A minimal synthetic state — just the fields composeCombatRecap + effPower read on vanilla units
// (no mods/upgrades/auras/scar), so the reconstruction logic is exercised without a full engine game.
type Unit = { id: string; owner: 0 | 1; zone: 0 | 1 | 2; upgrades: never[]; mods: never[]; damage: number; created: undefined }
const unit = (id: string, owner: 0 | 1): Unit => ({ id, owner, zone: 1, upgrades: [], mods: [], damage: 0, created: undefined })

function makeState(defs: Record<string, { name: string; power: number }>, unitIds: Record<string, 0 | 1>, extra: Partial<GameState> = {}): GameState {
  const cardSet: Record<string, unknown> = {}
  const cardOf: Record<string, string> = {}
  const units: Record<string, Unit> = {}
  for (const [id, owner] of Object.entries(unitIds)) {
    const slug = id // slug == id for the test
    cardSet[slug] = { ...defs[id], slug, kind: 'unit' }
    cardOf[id] = slug
    units[id] = unit(id, owner)
  }
  return {
    influence: 0,
    cardSet,
    cardOf,
    units,
    sides: [{ name: 'You', life: 20 }, { name: 'Crimson', life: 20 }],
    pendingAttack: null,
    ...extra,
  } as unknown as GameState
}

const evs = (...msgs: string[]) => msgs.map(msg => ({ msg }))
const isCombat = (m: string) => /damage|destroyed|falls|hope|influence|freed|captur/i.test(m)

describe('composeCombatRecap', () => {
  it('narrates a lone duel where the attacker falls (the complaint case)', () => {
    const defs = { a1: { name: 'Berserker', power: 3 }, d1: { name: 'Radiant Citadel', power: 5 } }
    const prev = makeState(defs, { a1: 0, d1: 1 })
    const next = makeState(defs, { d1: 1 }) // a1 gone — it died
    const action: GameAction = { type: 'attack', attackers: ['a1'], target: { kind: 'unit', id: 'd1' } as TargetRef }
    const out = composeCombatRecap(prev, next, action, evs(
      'Radiant Citadel takes 3 damage from Berserker',
      'Berserker takes 5 damage from Radiant Citadel',
      'Berserker is destroyed',
    ), isCombat)
    expect(out).toEqual(['Berserker (3) ↔ Radiant Citadel (5): dealt 3, took 5 — Berserker falls'])
  })

  it('narrates a non-lethal trade (both hold)', () => {
    const defs = { a1: { name: 'Skirmisher', power: 2 }, d1: { name: 'Bulwark', power: 1 } }
    const prev = makeState(defs, { a1: 0, d1: 1 })
    const next = makeState(defs, { a1: 0, d1: 1 })
    const action: GameAction = { type: 'attack', attackers: ['a1'], target: { kind: 'unit', id: 'd1' } as TargetRef }
    const out = composeCombatRecap(prev, next, action, evs(
      'Bulwark takes 2 damage from Skirmisher',
      'Skirmisher takes 1 damage from Bulwark',
    ), isCombat)
    expect(out).toEqual(['Skirmisher (2) ↔ Bulwark (1): dealt 2, took 1 — both hold'])
  })

  it('narrates a blocked sub-duel (the blocker stepped in front)', () => {
    const defs = { a1: { name: 'Raider', power: 3 }, b1: { name: 'Guardian', power: 4 }, t1: { name: 'Oracle', power: 1 } }
    const prev = makeState(defs, { a1: 0, b1: 1, t1: 1 }, { pendingAttack: { seat: 0, attackers: ['a1'], target: { kind: 'unit', id: 't1' }, overextend: [] } as unknown as GameState['pendingAttack'] })
    const next = makeState(defs, { b1: 1, t1: 1 }) // a1 died to the counter
    const action: GameAction = { type: 'block', pairs: [{ blocker: 'b1', onto: 'a1' }] }
    const out = composeCombatRecap(prev, next, action, evs(
      'Guardian takes 3 damage from Raider',
      'Raider takes 4 damage from Guardian',
      'Raider is destroyed',
    ), isCombat)
    expect(out).toEqual(['Raider (3) ↔ Guardian (4, blocking): dealt 3, took 4 — Raider falls'])
  })

  it('shows a shield fully absorbing a hit', () => {
    const defs = { a1: { name: 'Lancer', power: 4 }, d1: { name: 'Warden', power: 2 } }
    const prev = makeState(defs, { a1: 0, d1: 1 })
    const next = makeState(defs, { a1: 0, d1: 1 })
    const action: GameAction = { type: 'attack', attackers: ['a1'], target: { kind: 'unit', id: 'd1' } as TargetRef }
    const out = composeCombatRecap(prev, next, action, evs(
      "Warden's shield absorbs the blow",
      'Lancer takes 2 damage from Warden',
    ), isCombat)
    expect(out).toEqual(['Lancer (4) ↔ Warden (2): dealt 0 (shield held), took 2 — both hold'])
  })

  it('tells the base it does not hit back', () => {
    const defs = { a1: { name: 'Raider', power: 4 } }
    const prev = makeState(defs, { a1: 0 })
    const next = makeState(defs, { a1: 0 })
    const action: GameAction = { type: 'attack', attackers: ['a1'], target: { kind: 'base', seat: 1 } as TargetRef }
    const out = composeCombatRecap(prev, next, action, evs('Crimson takes 4 damage from Raider (16 life)'), isCombat)
    expect(out).toEqual(["Raider strike Crimson's base for 4 — the base can't strike back (16 life)"])
  })

  it('keeps non-participant combat consequences as leftover lines', () => {
    const defs = { a1: { name: 'Berserker', power: 3 }, d1: { name: 'Radiant Citadel', power: 5 } }
    const prev = makeState(defs, { a1: 0, d1: 1 })
    const next = makeState(defs, { d1: 1 })
    const action: GameAction = { type: 'attack', attackers: ['a1'], target: { kind: 'unit', id: 'd1' } as TargetRef }
    const out = composeCombatRecap(prev, next, action, evs(
      'Radiant Citadel takes 3 damage from Berserker',
      'Berserker takes 5 damage from Radiant Citadel',
      'Berserker is destroyed',
      'Crimson gains 2 Hope',
    ), isCombat)
    expect(out).toEqual([
      'Berserker (3) ↔ Radiant Citadel (5): dealt 3, took 5 — Berserker falls',
      'Crimson gains 2 Hope',
    ])
  })

  it('falls back (null) for non-combat actions', () => {
    const defs = { a1: { name: 'Berserker', power: 3 } }
    const prev = makeState(defs, { a1: 0 })
    const next = makeState(defs, { a1: 0 })
    const action: GameAction = { type: 'play', card: 'a1' }
    expect(composeCombatRecap(prev, next, action, evs('something happens'), isCombat)).toBeNull()
  })

  it('falls back when an attack only opened a block window', () => {
    const defs = { a1: { name: 'Berserker', power: 3 }, d1: { name: 'Wall', power: 0 } }
    const prev = makeState(defs, { a1: 0, d1: 1 })
    const next = makeState(defs, { a1: 0, d1: 1 }, { pendingAttack: { seat: 0, attackers: ['a1'], target: { kind: 'unit', id: 'd1' }, overextend: [] } as unknown as GameState['pendingAttack'] })
    const action: GameAction = { type: 'attack', attackers: ['a1'], target: { kind: 'unit', id: 'd1' } as TargetRef }
    expect(composeCombatRecap(prev, next, action, evs('You may assign blockers'), isCombat)).toBeNull()
  })
})
