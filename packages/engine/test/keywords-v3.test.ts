import { describe, it, expect } from 'vitest'
import type { CardSet, GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { V3_RULES } from '../src/rules.ts'
import { effPower } from '../src/helpers.ts'
import { damageUnit } from '../src/effects.ts'
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
