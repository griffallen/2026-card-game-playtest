import { describe, it, expect } from 'vitest'
import type { GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { put } from './util.ts'

// PR #46 / decision 93: Fiery Impaler's splash becomes a declared choice — any unit in the
// combat zone except the attack's target, even your own; a kill by the skewer reaps influence.
function g(): GameState {
  let s = createGame({
    seed: 46, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet: CARD_SET,
    players: [{ name: 'G', deck: deckSlugs(PREBUILT_DECKS[0]) }, { name: 'M', deck: deckSlugs(PREBUILT_DECKS[1]) }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

describe('splashReap (Fiery Impaler, PR #46, decision 93)', () => {
  it('the declared victim takes 1; a kill reaps 1 influence', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const imp = put(s, me, 'fiery-impaler', 1)
    const wall = put(s, them, 'berserker', 1, { exhausted: true })  // no onDefend payout to muddy the influence check
    // spark-hound: no death payout (PR #54 made vanguard-sentinel a martyr — bad fixture)
    const wisp = put(s, them, 'spark-hound', 1, { exhausted: true, damage: 0 })
    s.units[wisp].damage = (CARD_SET['spark-hound'].health ?? 1) - 1
    const before = s.influence
    s = applyAction(s, {
      type: 'attack', attackers: [imp], target: { kind: 'unit', id: wall },
      splash: [{ by: imp, unit: wisp }],
    }, me).state
    expect(s.units[wisp]).toBeUndefined()                       // skewered dead
    expect(s.influence).toBe(me === 0 ? before + 1 : before - 1) // the reap
  })

  it('friendly fire is legal — even your own unit (designer, PR #46)', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const imp = put(s, me, 'fiery-impaler', 1)
    const mine = put(s, me, 'berserker', 1)
    const wall = put(s, them, 'bulwark-protector', 1, { exhausted: true })
    s = applyAction(s, {
      type: 'attack', attackers: [imp], target: { kind: 'unit', id: wall },
      splash: [{ by: imp, unit: mine }],
    }, me).state
    expect(s.units[mine].damage).toBe(1)
  })

  it('cannot skewer the attack target itself; must declare when candidates exist', () => {
    const s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const imp = put(s, me, 'fiery-impaler', 1)
    const wall = put(s, them, 'bulwark-protector', 1, { exhausted: true })
    put(s, them, 'vanguard-sentinel', 1, { exhausted: true })
    expect(() => applyAction(s, {
      type: 'attack', attackers: [imp], target: { kind: 'unit', id: wall },
      splash: [{ by: imp, unit: wall }],
    }, me)).toThrow(/ALSO/)
    expect(() => applyAction(s, {
      type: 'attack', attackers: [imp], target: { kind: 'unit', id: wall },
    }, me)).toThrow(/must declare/)
  })

  it('no candidates → the trigger fizzles and the attack proceeds bare', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const imp = put(s, me, 'fiery-impaler', 1)
    const wall = put(s, them, 'bulwark-protector', 1, { exhausted: true })  // alone in the zone
    s = applyAction(s, { type: 'attack', attackers: [imp], target: { kind: 'unit', id: wall } }, me).state
    expect(s.units[wall].damage).toBeGreaterThan(0)
  })

  it('base attacks never splash; enumeration carries one variant per victim', () => {
    const s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const imp = put(s, me, 'fiery-impaler', 1)
    const wall = put(s, them, 'bulwark-protector', 1, { exhausted: true })
    const officer = put(s, them, 'vanguard-sentinel', 1, { exhausted: true })
    const attacks = getLegalActions(s, me).filter(a => a.type === 'attack')
    const onWall = attacks.filter(a => a.target.kind === 'unit' && a.target.id === wall)
    // one victim available: their officer (not the wall — it's the target; not itself — no self-skewer)
    expect(onWall.map(a => a.splash?.[0]?.unit)).toEqual([officer])
    void imp
  })
})
