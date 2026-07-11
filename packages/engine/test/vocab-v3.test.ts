import { describe, it, expect } from 'vitest'
import type { CardSet, GameState, Seat } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'

// Slice V3-5a — vocabulary: modal actions (PR #13), linked amounts (Blood Rush),
// conditional bonus (Devastating Strike). Spec §3.
const V: CardSet = {
  ...T,
  // Griff's modal Reckless Charge shape: Rush OR count-pump — modes carry their own targets+ops
  modal: { slug: 'modal', name: 'modal', color: 'red', type: 'action', cost: 1, text: '', modes: [
    { label: 'rush', targets: [{ t: 'unit', side: 'friendly' }], ops: [{ op: 'grant', t: 'chosen0', kw: { k: 'rush' }, dur: 'round' }] },
    { label: 'bolt', targets: [{ t: 'unit', side: 'any' }], ops: [{ op: 'damage', t: 'chosen0', n: 1 }] },
  ] },
  // Blood Rush shape: clear a friendly unit's damage, deal that much to your own Home
  bloodrush: { slug: 'bloodrush', name: 'bloodrush', color: 'red', type: 'action', cost: 2, text: '',
    targets: [{ t: 'unit', side: 'friendly' }],
    onPlay: [{ op: 'clearDamage', t: 'chosen0' }, { op: 'damage', t: 'selfBase', n: 'linked' }] },
  // Devastating Strike shape: 2, or 3 to an already-damaged unit
  devstrike: { slug: 'devstrike', name: 'devstrike', color: 'red', type: 'action', cost: 1, text: '',
    targets: [{ t: 'unit', side: 'any' }],
    onPlay: [{ op: 'damage', t: 'chosen0', n: 2, bonusIfDamaged: 1 }] },
}

function g(): GameState {
  let s = createGame({
    seed: 31,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: V,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}
let n = 8200
function give(s: GameState, seat: Seat, slug: string): string {
  const id = `v${n++}`
  s.cardOf[id] = slug; s.sides[seat].hand.push(id)
  for (let i = 0; i < 4; i++) { const r = `v${n++}`; s.cardOf[r] = 'pawn'; s.sides[seat].resources.push({ id: r, exhausted: false }) }
  return id
}

describe('modal actions — the mode is declared at cast time (decision-24-safe)', () => {
  it('each mode runs its own ops on its own targets; a modal card demands a mode', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as Seat
    const mine = put(s, me, 'brute', 1)
    const theirs = put(s, them, 'brute', 1)
    const c1 = give(s, me, 'modal')
    expect(() => applyAction(s, { type: 'play', card: c1, targets: [{ kind: 'unit', id: mine }] }, me))
      .toThrowError(/mode/i)
    s = applyAction(s, { type: 'play', card: c1, mode: 1, targets: [{ kind: 'unit', id: theirs }] }, me).state
    expect(s.units[theirs].damage).toBe(1)
    s.actorSeat = me
    const c2 = give(s, me, 'modal')
    s = applyAction(s, { type: 'play', card: c2, mode: 0, targets: [{ kind: 'unit', id: mine }] }, me).state
    expect(s.units[mine].mods.some(m => m.kw?.k === 'rush')).toBe(true)
  })

  it('legal actions enumerate every mode separately', () => {
    const s = g()
    const me = s.actorSeat
    put(s, me, 'brute', 1)
    give(s, me, 'modal')
    const plays = getLegalActions(s, me).filter(a => a.type === 'play' && s.cardOf[a.card] === 'modal')
    const modes = new Set(plays.map(p => p.type === 'play' ? p.mode : undefined))
    expect(modes.has(0) && modes.has(1)).toBe(true)
    expect(modes.has(undefined)).toBe(false)
  })
})

describe('linked amounts — "that much" flows between ops', () => {
  it('clearDamage feeds the linked damage to your own Home (Blood Rush)', () => {
    let s = g()
    const me = s.actorSeat
    const wounded = put(s, me, 'brute', 1, { damage: 2 })
    const card = give(s, me, 'bloodrush')
    const lifeBefore = s.sides[me].life
    s = applyAction(s, { type: 'play', card, targets: [{ kind: 'unit', id: wounded }] }, me).state
    expect(s.units[wounded].damage).toBe(0)
    expect(s.sides[me].life).toBe(lifeBefore - 2)   // exactly what was removed
  })
})

describe('conditional bonus — reads the target BEFORE the hit', () => {
  it('deals n to a fresh unit, n+bonus to a damaged one', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as Seat
    const fresh = put(s, them, 'brute', 1)                 // 4/3 fresh
    const hurt = put(s, them, 'wall', 1, { damage: 2 })    // 0/5 with 2: only the bonus kills
    const c1 = give(s, me, 'devstrike')
    s = applyAction(s, { type: 'play', card: c1, targets: [{ kind: 'unit', id: fresh }] }, me).state
    expect(s.units[fresh].damage).toBe(2)                  // no bonus
    s.actorSeat = me
    const c2 = give(s, me, 'devstrike')
    s = applyAction(s, { type: 'play', card: c2, targets: [{ kind: 'unit', id: hurt }] }, me).state
    expect(s.units[hurt]).toBeUndefined()                  // 2 + (2+1) = exactly 5: bonus is the kill
  })
})

// ── V3-5b: upTo/sameZone targets · countBuff · filtered multi-round double ──
import { endRound } from '../src/round.ts'
import { effPower } from '../src/helpers.ts'
function endRoundForTest(s: GameState) { endRound(s, s.actorSeat) }
const V2: CardSet = {
  ...T,
  slam: { slug: 'slam', name: 'slam', color: 'red', type: 'action', cost: 3, text: '',
    targets: [{ t: 'unit', side: 'any', count: 2, upTo: true, sameZone: true }],
    onPlay: [{ op: 'damage', t: 'chosen0', n: 3 }, { op: 'damage', t: 'chosen1', n: 3 }] },
  packbuff: { slug: 'packbuff', name: 'packbuff', color: 'red', type: 'action', cost: 1, text: '',
    targets: [{ t: 'unit', side: 'friendly' }],
    onPlay: [{ op: 'countBuff', t: 'chosen0', per: { color: 'red', side: 'all', zone: 'ofTarget', other: true }, p: 1, dur: 'round' }] },
  rage2: { slug: 'rage2', name: 'rage2', color: 'red', type: 'action', cost: 7, text: '',
    onPlay: [{ op: 'double', t: { side: 'friendly' }, rounds: 2 }] },
}

function g2(): GameState {
  let s = createGame({
    seed: 32,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: V2,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

describe('upTo + sameZone targets (Volcanic Slam shape)', () => {
  it('accepts one or two same-zone targets, rejects cross-zone pairs', () => {
    let s = g2()
    const me = s.actorSeat, them = (1 - me) as Seat
    const x = put(s, them, 'wall', 1)   // 0/5: survives 3
    const y = put(s, them, 'wall', 1)
    const z = put(s, them, 'wall', 2)
    const c1 = give(s, me, 'slam')
    expect(() => applyAction(s, { type: 'play', card: c1, targets: [{ kind: 'unit', id: x }, { kind: 'unit', id: z }] }, me))
      .toThrowError(/zone/i)
    s = applyAction(s, { type: 'play', card: c1, targets: [{ kind: 'unit', id: x }, { kind: 'unit', id: y }] }, me).state
    expect(s.units[x].damage).toBe(3)
    expect(s.units[y].damage).toBe(3)
    s.actorSeat = me
    const c2 = give(s, me, 'slam')
    s = applyAction(s, { type: 'play', card: c2, targets: [{ kind: 'unit', id: z }] }, me).state   // "up to": one is fine
    expect(s.units[z].damage).toBe(3)
  })
})

describe('countBuff (Reckless mode-B shape)', () => {
  it('+1 per OTHER red unit in the target zone, both sides counted', () => {
    let s = g2()
    const me = s.actorSeat, them = (1 - me) as Seat
    const target = put(s, me, 'soldier', 1)   // red 2/2
    put(s, me, 'brute', 1)                    // other red, mine
    put(s, them, 'pawn', 1)                   // other red, theirs — counts too
    put(s, them, 'pawn', 2)                   // different zone — no
    const card = give(s, me, 'packbuff')
    s = applyAction(s, { type: 'play', card, targets: [{ kind: 'unit', id: target }] }, me).state
    expect(effPower(s, s.units[target])).toBe(4)   // 2 + 2 others in zone
  })
})

describe('filtered, multi-round double (Unchained Rage shape)', () => {
  it('doubles ALL your units and survives exactly two round-ends', () => {
    let s = g2()
    const me = s.actorSeat
    const u1 = put(s, me, 'brute', 1)     // 4 → 8
    const u2 = put(s, me, 'soldier', 2)   // 2 → 4
    const card = give(s, me, 'rage2')
    for (let i = 0; i < 4; i++) { const r = `v${9900 + i}`; s.cardOf[r] = 'pawn'; s.sides[me].resources.push({ id: r, exhausted: false }) }
    s = applyAction(s, { type: 'play', card }, me).state
    expect(effPower(s, s.units[u1])).toBe(8)
    expect(effPower(s, s.units[u2])).toBe(4)
    endRoundForTest(s); expect(effPower(s, s.units[u1])).toBe(8)   // round 1 ends: still raging
    endRoundForTest(s); expect(effPower(s, s.units[u1])).toBe(4)   // round 2 ends: spent
  })
})
