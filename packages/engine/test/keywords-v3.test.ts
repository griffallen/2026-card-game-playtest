import { describe, it, expect } from 'vitest'
import type { CardSet, GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { V3_RULES } from '../src/rules.ts'
import { effPower } from '../src/helpers.ts'
import { damageUnit, destroyUnit } from '../src/effects.ts'
import { T, toyDeck, put } from './util.ts'

// Slice V3-3a — the v3 keyword suite, part 1 (spec game-rules-v3-draft §2):
// Scar (capped, decision 70) · Shielded · Hidden (decision 59 + Q7)
const K: CardSet = {
  ...T,
  scarred: { slug: 'scarred', name: 'scarred', color: 'red', type: 'unit', cost: 3, power: 2, health: 5, text: '', kw: [{ k: 'scar' }] },
  shell:   { slug: 'shell', name: 'shell', color: 'yellow', type: 'unit', cost: 2, power: 1, health: 3, text: '', kw: [{ k: 'shielded' }] },
  ghost:   { slug: 'ghost', name: 'ghost', color: 'purple', type: 'unit', cost: 2, power: 2, health: 2, text: '', kw: [{ k: 'hidden' }] },
}

function v3game(): GameState {
  let s = createGame({
    seed: 11,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: K,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

describe('Scar — +1 power per damage, capped at remaining health (decision 70)', () => {
  it('grows with wounds but never past what it could survive', () => {
    const s = v3game()
    const id = put(s, 0, 'scarred', 2)                 // 2/5
    expect(effPower(s, s.units[id])).toBe(2)           // unhurt: no bonus
    s.units[id].damage = 2
    expect(effPower(s, s.units[id])).toBe(4)           // min(2, 3) = +2
    s.units[id].damage = 4
    expect(effPower(s, s.units[id])).toBe(3)           // min(4, 1) = +1 — the designer's example shape
  })
})

describe('Shielded — the first damage instance is prevented entirely', () => {
  it('eats one hit, then behaves normally', () => {
    const s = v3game()
    const id = put(s, 0, 'shell', 2)
    expect(s.units[id].shielded).toBe(true)            // enters with the token
    damageUnit(s, s.units[id], 2, 'test')
    expect(s.units[id].damage).toBe(0)                 // prevented entirely
    expect(s.units[id].shielded).toBe(false)           // token spent
    damageUnit(s, s.units[id], 2, 'test')
    expect(s.units[id].damage).toBe(2)                 // second instance lands
  })
})

describe('Hidden — while ready: untouchable; exhausted: fair game (decision 59)', () => {
  it('enemy actions cannot target a ready Hidden unit; its owner still can', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const ghost = put(s, them, 'ghost', 2)
    const boltIn = `k${Math.random() * 0 + 7000}`
    s.cardOf[boltIn] = 'bolt'; s.sides[me].hand.push(boltIn)
    // enemy bolt cannot pick the ready ghost
    expect(() => applyAction(s, { type: 'play', card: boltIn, targets: [{ kind: 'unit', id: ghost }] }, me))
      .toThrowError(/hidden|targeted/i)
    // once exhausted (it struck from the shadows), it is revealed
    s.units[ghost].exhausted = true
    expect(() => applyAction(s, { type: 'play', card: boltIn, targets: [{ kind: 'unit', id: ghost }] }, me))
      .not.toThrow()
  })

  it('cannot be declared as an attack target while ready', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const ghost = put(s, them, 'ghost', 2)
    put(s, me, 'soldier', 2)
    const attacks = getLegalActions(s, me).filter(a => a.type === 'attack')
    expect(attacks.some(a => a.target.kind === 'unit' && a.target.id === ghost)).toBe(false)
    s.units[ghost].exhausted = true
    const attacks2 = getLegalActions(s, me).filter(a => a.type === 'attack')
    expect(attacks2.some(a => a.target.kind === 'unit' && a.target.id === ghost)).toBe(true)
  })
})

// ── V3-3b: Infiltrate · Sneak · Capture ─────────────────────────────────────
const K2: CardSet = {
  ...T,
  sapper: { slug: 'sapper', name: 'sapper', color: 'purple', type: 'unit', cost: 2, power: 2, health: 2, text: '', kw: [{ k: 'infiltrate' }] },
  knifer: { slug: 'knifer', name: 'knifer', color: 'purple', type: 'unit', cost: 3, power: 2, health: 3, text: '',
    kw: [{ k: 'sneak' }], sneak: { targets: [{ t: 'unit', side: 'enemy' }], ops: [{ op: 'damage', t: 'chosen0', n: 2 }] } },
  jailer: { slug: 'jailer', name: 'jailer', color: 'yellow', type: 'unit', cost: 4, power: 2, health: 4, text: '',
    kw: [{ k: 'capture' }], targets: [{ t: 'unit', side: 'enemy' }], onPlay: [{ op: 'capture', t: 'chosen0' }] },
}

function v3game2(): GameState {
  let s = createGame({
    seed: 12,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: K2,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}
let m = 7100
function give(s: GameState, seat: 0 | 1, slug: string): string {
  const id = `q${m++}`
  s.cardOf[id] = slug; s.sides[seat].hand.push(id)
  for (let i = 0; i < 8; i++) s.sides[seat].resources.push({ id: `q${m++}`, exhausted: false }), s.cardOf[`q${m - 1}`] = 'pawn'
  return id
}

describe('Infiltrate — deploy to any zone', () => {
  it('deploys to a chosen zone; non-infiltrators cannot choose', () => {
    let s = v3game2()
    const me = s.actorSeat
    const card = give(s, me, 'sapper')
    s = applyAction(s, { type: 'play', card, zone: 1 }, me).state
    expect(s.units[card].zone).toBe(1)
    const s2 = v3game2()
    const me2 = s2.actorSeat
    const plain = give(s2, me2, 'soldier')
    expect(() => applyAction(s2, { type: 'play', card: plain, zone: 1 }, me2)).toThrowError(/infiltrate/i)
  })
})

describe('Sneak — exhaust-activated per-card payload (decision 60)', () => {
  it('activates from ready, hits same-zone only, exhausts (and reveals) the unit', () => {
    const s = v3game2()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const knifer = put(s, me, 'knifer', 1)
    const near = put(s, them, 'brute', 1)     // 4/3: survives the 2-damage payload
    const far = put(s, them, 'brute', 2)
    expect(() => applyAction(s, { type: 'activate', unit: knifer, targets: [{ kind: 'unit', id: far }] }, me))
      .toThrowError(/zone/i)
    const s1 = applyAction(s, { type: 'activate', unit: knifer, targets: [{ kind: 'unit', id: near }] }, me).state
    expect(s1.units[near].damage).toBe(2)
    expect(s1.units[knifer].exhausted).toBe(true)
    s1.actorSeat = me   // tests own the window
    expect(() => applyAction(s1, { type: 'activate', unit: knifer, targets: [{ kind: 'unit', id: near }] }, me))
      .toThrowError(/exhaust/i)
  })
})

describe('Capture — the captive lifecycle (decisions 61, spec §2)', () => {
  it('captures under, holder skips ready, release returns the captive READY (decision 73)', () => {
    let s = v3game2()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const victim = put(s, them, 'soldier', s.actorSeat === 0 ? 0 : 2)
    const card = give(s, me, 'jailer')
    s = applyAction(s, { type: 'play', card, targets: [{ kind: 'unit', id: victim }] }, me).state
    expect(s.units[victim]).toBeUndefined()            // out of play, no zone presence
    expect(s.captives[victim]?.by).toBe(card)
    expect(s.units[card].exhausted).toBe(false)
    // release: capturer readies (it already is), captive returns READY to the zone (decision 73)
    s.actorSeat = me   // tests own the window
    s = applyAction(s, { type: 'releaseCaptive', unit: card }, me).state
    expect(s.captives[victim]).toBeUndefined()
    expect(s.units[victim].exhausted).toBe(false)      // decision 73 reverses 61: capture is temporary, the return is whole
    expect(s.units[victim].zone).toBe(s.units[card].zone)
  })

  it('capturer death frees the captive, ready (decision 73)', () => {
    const s = v3game2()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const victim = put(s, them, 'soldier', me === 0 ? 0 : 2)
    const card = give(s, me, 'jailer')
    const s2 = applyAction(s, { type: 'play', card, targets: [{ kind: 'unit', id: victim }] }, me).state
    destroyUnit(s2, s2.units[card], 'slain')
    expect(s2.units[card]).toBeUndefined()
    expect(s2.captives[victim]).toBeUndefined()
    expect(s2.units[victim].exhausted).toBe(false)
  })
})

// ── V3-6 engine tail: exhaust op · freeCaptives · warden capture · attachOrphan (decision 67) ──
const K3: CardSet = {
  ...T,
  warrant: { slug: 'warrant', name: 'warrant', color: 'yellow', type: 'action', cost: 1, text: '',
    targets: [{ t: 'unit', side: 'friendly' }, { t: 'unit', side: 'enemy' }],
    onPlay: [{ op: 'capture', t: 'chosen1', by: 'chosen0' }] },
  lullaby: { slug: 'lullaby', name: 'lullaby', color: 'yellow', type: 'action', cost: 2, text: '',
    targets: [{ t: 'unit', side: 'enemy' }], onPlay: [{ op: 'exhaust', t: 'chosen0' }] },
  jailbreak: { slug: 'jailbreak', name: 'jailbreak', color: 'yellow', type: 'action', cost: 3, text: '',
    onPlay: [{ op: 'freeCaptives' }] },
  charm: { slug: 'charm', name: 'charm', color: 'yellow', type: 'upgrade', cost: 2, text: '',
    statics: [{ s: 'aura', scope: 'attached', armor: 1 }] },
}

function v3game3(): GameState {
  let s = createGame({
    seed: 13,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: K3,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}
function give3(s: GameState, seat: 0 | 1, slug: string): string {
  const id = `q${m++}`
  s.cardOf[id] = slug; s.sides[seat].hand.push(id)
  for (let i = 0; i < 4; i++) { const r = `q${m++}`; s.cardOf[r] = 'pawn'; s.sides[seat].resources.push({ id: r, exhausted: false }) }
  return id
}

describe('yellow-conversion vocabulary (V3-6)', () => {
  it('exhaust op puts a unit to sleep; warden capture routes through chosen0', () => {
    let s = v3game3()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const sleepy = put(s, them, 'brute', 1)
    const c1 = give3(s, me, 'lullaby')
    s = applyAction(s, { type: 'play', card: c1, targets: [{ kind: 'unit', id: sleepy }] }, me).state
    expect(s.units[sleepy].exhausted).toBe(true)
    s.actorSeat = me
    const warden = put(s, me, 'guardian', 1)
    const victim = put(s, them, 'soldier', 2)
    const c2 = give3(s, me, 'warrant')
    s = applyAction(s, { type: 'play', card: c2, targets: [{ kind: 'unit', id: warden }, { kind: 'unit', id: victim }] }, me).state
    expect(s.captives[victim]?.by).toBe(warden)
  })

  it('freeCaptives returns YOUR captured units, ready (decision 73)', () => {
    let s = v3game3()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const jailer = put(s, them, 'guardian', 1)
    const mine = put(s, me, 'soldier', 1)
    delete s.units[mine]
    s.captives[mine] = { unit: { ...s.units[jailer], id: mine, slug: 'soldier', owner: me, zone: 1, damage: 0, exhausted: false } as never, by: jailer }
    s.cardOf[mine] = 'soldier'
    const card = give3(s, me, 'jailbreak')
    s = applyAction(s, { type: 'play', card }, me).state
    expect(s.captives[mine]).toBeUndefined()
    expect(s.units[mine].exhausted).toBe(false)
  })

  it('attachOrphan: dead wearer orphans the upgrade; either side salvages at full cost (decision 67)', () => {
    let s = v3game3()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const wearer = put(s, them, 'soldier', 1)
    const up = `q${m++}`
    s.cardOf[up] = 'charm'
    s.upgrades[up] = { id: up, slug: 'charm', owner: them, attachedTo: wearer }
    s.units[wearer].upgrades.push(up)
    destroyUnit(s, s.units[wearer], 'slain')
    expect(s.upgrades[up].attachedTo).toBeNull()          // orphaned, not discarded
    expect(s.upgrades[up].orphanedIn).toBe(1)
    // the OTHER side salvages it onto their own unit in that zone, paying cost 2
    const scav = put(s, me, 'brute', 1)
    s.actorSeat = me
    for (let i = 0; i < 2; i++) { const r = `q${m++}`; s.cardOf[r] = 'pawn'; s.sides[me].resources.push({ id: r, exhausted: false }) }
    const before = s.sides[me].resources.filter(r => !r.exhausted).length
    s = applyAction(s, { type: 'attachOrphan', upgrade: up, unit: scav }, me).state
    expect(s.upgrades[up].attachedTo).toBe(scav)
    expect(s.upgrades[up].owner).toBe(me)                 // the sword changes hands
    expect(before - s.sides[me].resources.filter(r => !r.exhausted).length).toBe(2)
  })
})
