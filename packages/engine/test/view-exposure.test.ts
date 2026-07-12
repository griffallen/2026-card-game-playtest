import { describe, it, expect } from 'vitest'
import type { CardSet, GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { viewFor } from '../src/view.ts'
import { V3_RULES } from '../src/rules.ts'
import { destroyUnit } from '../src/effects.ts'
import { T, toyDeck, put } from './util.ts'

// #23 "nothing hidden": everything a player could act on must be visible in the view —
// captives held by a capturer, orphaned upgrades waiting in a zone, and a shield that is
// actually spent. Plus two engine minors from the consistency sweep, fixed by assumption:
// salvage pays the upgrade-pressure tax like any other second upgrade, and v3 attacks
// reject the dead overextend declaration outright.
const K: CardSet = {
  ...T,
  jailer: { slug: 'jailer', name: 'jailer', color: 'yellow', type: 'unit', cost: 4, power: 2, health: 4, text: '',
    kw: [{ k: 'capture' }], targets: [{ t: 'unit', side: 'enemy' }], onPlay: [{ op: 'capture', t: 'chosen0' }] },
  shell: { slug: 'shell', name: 'shell', color: 'yellow', type: 'unit', cost: 2, power: 1, health: 3, text: '', kw: [{ k: 'shielded' }] },
  charm: { slug: 'charm', name: 'charm', color: 'yellow', type: 'upgrade', cost: 2, text: '',
    statics: [{ s: 'aura', scope: 'attached', armor: 1 }] },
}

function v3game(): GameState {
  let s = createGame({
    seed: 21,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: K,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}
let m = 9200
function give(s: GameState, seat: 0 | 1, slug: string): string {
  const id = `v${m++}`
  s.cardOf[id] = slug; s.sides[seat].hand.push(id)
  for (let i = 0; i < 6; i++) { const r = `v${m++}`; s.cardOf[r] = 'pawn'; s.sides[seat].resources.push({ id: r, exhausted: false }) }
  return id
}

describe('view exposure — nothing hidden (#23)', () => {
  it('a capturer wears its captives in every view', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const victim = put(s, them, 'soldier', me === 0 ? 0 : 2)
    const card = give(s, me, 'jailer')
    s = applyAction(s, { type: 'play', card, targets: [{ kind: 'unit', id: victim }] }, me).state
    for (const viewer of [me, them, null] as const) {
      const v = viewFor(s, viewer)
      const chip = v.zones.flatMap(z => z.units).find(u => u.id === card)
      expect(chip?.captives).toEqual([{ id: victim, slug: 'soldier', name: 'soldier', owner: them }])
    }
  })

  it('orphaned upgrades appear in their zone, for both players', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const wearer = put(s, them, 'soldier', 1)
    const up = `v${m++}`
    s.cardOf[up] = 'charm'
    s.upgrades[up] = { id: up, slug: 'charm', owner: them, attachedTo: wearer }
    s.units[wearer].upgrades.push(up)
    destroyUnit(s, s.units[wearer], 'slain')
    for (const viewer of [me, them, null] as const) {
      const v = viewFor(s, viewer)
      expect(v.zones[1].orphans).toEqual([{ id: up, slug: 'charm', name: 'charm', owner: them }])
      expect(v.zones[0].orphans).toEqual([])
    }
  })

  it('a spent shield leaves the view: keywords and the shielded flag track the live token', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const shell = put(s, them, 'shell', 1)
    const fresh = viewFor(s, me).zones[1].units.find(u => u.id === shell)
    expect(fresh?.shielded).toBe(true)
    expect(fresh?.keywords).toContain('shielded')
    s.units[shell].shielded = false   // token spent (damage path has its own tests)
    const after = viewFor(s, me).zones[1].units.find(u => u.id === shell)
    expect(after?.shielded).toBe(false)
    expect(after?.keywords).not.toContain('shielded')
  })
})

describe('engine minors from the consistency sweep (#23, logged assumptions)', () => {
  it('salvaging a second upgrade pays upgrade pressure when the knob is on (v3 cut it — decision 83)', () => {
    // decision 83 zeroes the tax in V3_RULES; the mechanism itself must keep working for v2.3,
    // so this test turns the knob back on explicitly.
    let s = v3game()
    s.rules = { ...s.rules, upgradePressureInfluence: 1 }
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const scav = put(s, me, 'brute', 1)
    // already wearing one upgrade
    const worn = `v${m++}`
    s.cardOf[worn] = 'charm'
    s.upgrades[worn] = { id: worn, slug: 'charm', owner: me, attachedTo: scav }
    s.units[scav].upgrades.push(worn)
    // a second charm lies orphaned in the same zone
    const up = `v${m++}`
    s.cardOf[up] = 'charm'
    s.upgrades[up] = { id: up, slug: 'charm', owner: them, attachedTo: null, orphanedIn: 1 }
    for (let i = 0; i < 2; i++) { const r = `v${m++}`; s.cardOf[r] = 'pawn'; s.sides[me].resources.push({ id: r, exhausted: false }) }
    s.actorSeat = me
    const before = me === 0 ? s.influence : -s.influence
    s = applyAction(s, { type: 'attachOrphan', upgrade: up, unit: scav }, me).state
    const after = me === 0 ? s.influence : -s.influence
    expect(after - before).toBe(-1)   // opponent gains 1: the greed tax (v2.3 §1.6.4)
  })

  it('v3 attacks reject an overextend declaration — the keyword left with the prisons', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const raider = put(s, me, 'loner', 1)   // carries the overextend keyword; v3 must still refuse
    const wall = put(s, them, 'wall', 1)
    s.actorSeat = me
    expect(() => applyAction(s, { type: 'attack', attackers: [raider], target: { kind: 'unit', id: wall }, overextend: [raider] }, me))
      .toThrowError(/overextend/i)
  })
})
