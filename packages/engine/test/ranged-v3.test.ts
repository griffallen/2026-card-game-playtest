import { describe, it, expect } from 'vitest'
import type { CardSet, GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'

// Decision 80 (#24 court Q9, Griff): v3 Ranged is reborn as an ability action — exhaust the
// unit to deal its Ranged N to one enemy unit in ANY zone — while its ATTACKS become ordinary
// (same-zone only, blockable, no base ban). v2.3 keeps the old sniper-shot semantics.
const K: CardSet = {
  ...T,
  bowman: { slug: 'bowman', name: 'bowman', color: 'purple', type: 'unit', cost: 2, power: 1, health: 2, text: '',
    kw: [{ k: 'ranged', n: 2 }], onKill: [{ op: 'influence', n: 1 }] },
  ghost: { slug: 'ghost', name: 'ghost', color: 'purple', type: 'unit', cost: 2, power: 2, health: 2, text: '', kw: [{ k: 'hidden' }] },
}

function v3game(): GameState {
  let s = createGame({
    seed: 71,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: K,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

const inf = (s: GameState, seat: 0 | 1) => (seat === 0 ? s.influence : -s.influence)

describe('v3 Ranged is an ability, not an attack style (decision 80)', () => {
  it('volley: exhaust to deal N to an enemy unit in ANY zone; a lethal volley pays onKill', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const bowman = put(s, me, 'bowman', me === 0 ? 0 : 2)     // home zone
    const far = put(s, them, 'soldier', them === 0 ? 0 : 2)   // 2/2 across the world
    s.actorSeat = me
    const before = inf(s, me)
    s = applyAction(s, { type: 'activate', unit: bowman, targets: [{ kind: 'unit', id: far }] }, me).state
    expect(s.units[far]).toBeUndefined()                      // 2 damage felled the 2/2
    expect(s.units[bowman].exhausted).toBe(true)              // the volley spends the archer
    expect(inf(s, me) - before).toBe(1)                       // decision 74: a kill is a kill — volleys too
  })

  it('volley cannot choose a ready Hidden unit (decision 76) and is offered across zones', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const bowman = put(s, me, 'bowman', 1)
    const veiled = put(s, them, 'ghost', 2)
    const open = put(s, them, 'soldier', 0)
    s.actorSeat = me
    const volleys = getLegalActions(s, me).filter(a => a.type === 'activate' && a.unit === bowman)
    const targetIds = volleys.map(a => (a.type === 'activate' && a.targets?.[0].kind === 'unit' ? a.targets[0].id : ''))
    expect(targetIds).toContain(open)                         // any zone
    expect(targetIds).not.toContain(veiled)                   // hidden beats choices
    expect(() => applyAction(s, { type: 'activate', unit: bowman, targets: [{ kind: 'unit', id: veiled }] }, me))
      .toThrowError(/hidden/i)
  })

  it("v3 ranged ATTACKS are ordinary: no cross-zone reach, no base ban", () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const bowman = put(s, me, 'bowman', 1)
    const far = put(s, them, 'soldier', them === 0 ? 0 : 2)
    s.actorSeat = me
    expect(() => applyAction(s, { type: 'attack', attackers: [bowman], target: { kind: 'unit', id: far } }, me))
      .toThrowError(/zone/i)                                  // cross-zone shot is gone in v3
    const s2 = v3game()
    const me2 = s2.actorSeat, them2 = (1 - me2) as 0 | 1
    const b2 = put(s2, me2, 'bowman', them2 === 0 ? 0 : 2)    // standing in the enemy home
    s2.actorSeat = me2
    const next = applyAction(s2, { type: 'attack', attackers: [b2], target: { kind: 'base', seat: them2 } }, me2).state
    expect(next.phase === 'block' || next.sides[them2].life < 20).toBe(true)   // base attack allowed now
  })
})
