import { describe, it, expect } from 'vitest'
import type { CardDef, CardSet, GameState, Seat } from '../src/types.ts'
import { homeZone } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { effPower, influenceFor } from '../src/helpers.ts'
import { T, toyDeck, put } from './util.ts'

// #104 (Dawnspear Paladin): a defensive brace. Its onDefend fires a `buff` scaled PER attacker —
//   "+1 Power for each attacker, this round" — and, crucially, the buff must be in effect BEFORE
//   the target's retaliation power is read (the whole point: braced under a gang-up, it hits back
//   harder). This exercises the new `per` modifier on the buff op AND the onDefend/retaliation
//   ordering fix in resolveBlockedAttack.

const u = (slug: string, cost: number, power: number, health: number, extra: Partial<CardDef> = {}): CardDef =>
  ({ slug, name: slug, color: 'yellow', type: 'unit', cost, power, health, text: '', ...extra })

const TT: CardSet = {
  ...T,
  // the toy Paladin: 3/3, onDefend +1 power per attacker, THIS ROUND (same effect shape as the real card)
  paladin: u('paladin', 5, 3, 3, { onDefend: [{ op: 'buff', t: 'self', p: 1, dur: 'round', per: { count: 'attackers' } }] }),
  // a harmless attacker: 0 power (never fells the 3/3 Paladin), high health (survives to be measured)
  spear: u('spear', 1, 0, 20),
}

function v3game(seed = 21): GameState {
  let s = createGame({
    seed,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: TT,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}
const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

describe('Dawnspear Paladin — defensive per-attacker Power brace (#104)', () => {
  it('a lone attacker gives +1 Power, and the buff is in effect for the retaliation', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const atk = put(s, me, 'spear', 1)          // 0/20, lone attacker
    const pal = put(s, them, 'paladin', 1)      // 3/3
    s = act(s, me, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: pal } })
    // singleAttackerDuels: a lone attacker on a non-guard opens no block window — combat resolves at once
    expect(s.phase).not.toBe('block')
    expect(effPower(s, s.units[pal])).toBe(4)   // 3 + 1 attacker, this round
    expect(s.units[atk].damage).toBe(4)         // retaliation read the buffed 4 (base 3 before the fix)
  })

  it('a gang of 3 gives +3 Power, and the buffed power is what strikes back (before retaliation)', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const a1 = put(s, me, 'spear', 1), a2 = put(s, me, 'spear', 1), a3 = put(s, me, 'spear', 1)  // 0/20 each
    const pal = put(s, them, 'paladin', 1)      // 3/3
    s = act(s, me, { type: 'attack', attackers: [a1, a2, a3], target: { kind: 'unit', id: pal } })
    expect(s.phase).toBe('block')               // a gang opens the block window
    s = act(s, them, { type: 'block', pairs: [] })   // let it through — the Paladin braces as declared target
    expect(effPower(s, s.units[pal])).toBe(6)   // 3 + 3 attackers, this round
    const dealt = s.units[a1].damage + s.units[a2].damage + s.units[a3].damage
    expect(dealt).toBe(6)                        // the buffed 6 poured across the gang (base 3 before the fix)
  })

  it('the Power bonus is THIS ROUND only — it resets to base 3 next round', () => {
    let s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const a1 = put(s, me, 'spear', 1), a2 = put(s, me, 'spear', 1)
    const pal = put(s, them, 'paladin', 1)
    s = act(s, me, { type: 'attack', attackers: [a1, a2], target: { kind: 'unit', id: pal } })
    s = act(s, them, { type: 'block', pairs: [] })
    expect(effPower(s, s.units[pal])).toBe(5)   // 3 + 2 this round
    // roll the round over: attacker's window is next; two passes end the round
    s = act(s, them, { type: 'pass' })
    s = act(s, me, { type: 'pass' })
    expect(s.round).toBeGreaterThan(1)          // a new round began
    expect(effPower(s, s.units[pal])).toBe(3)   // the round-scoped brace expired — back to base
  })

  it('the old on-attack "gain 2 Influence" is gone — attacking grants no influence (real card)', () => {
    let s = createGame({
      seed: 5, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet: CARD_SET,
      players: [{ name: 'Ada', deck: deckSlugs(PREBUILT_DECKS[0]) }, { name: 'Bo', deck: deckSlugs(PREBUILT_DECKS[1]) }],
    })
    while (s.phase === 'bank') s = act(s, s.actorSeat, { type: 'skipResource' })
    const me = s.actorSeat, them = (1 - me) as Seat
    const pal = put(s, me, 'dawnspear-paladin', homeZone(them))   // in the enemy home, to strike their base
    const before = influenceFor(s, me)
    s = act(s, me, { type: 'attack', attackers: [pal], target: { kind: 'base', seat: them } })
    expect(influenceFor(s, me)).toBe(before)    // no on-attack influence (the old engine paid +2)
  })

  it('real card is wired: onDefend per-attacker Power buff, no onAttack influence, still 3/3', () => {
    const def = CARD_SET['dawnspear-paladin']
    expect(def.power).toBe(3)
    expect(def.health).toBe(3)
    expect(def.onAttack).toBeUndefined()
    expect(def.onDefend).toEqual([{ op: 'buff', t: 'self', p: 1, dur: 'round', per: { count: 'attackers' } }])
  })

  it('real card in a live v3 game: braces +1 per attacker before it strikes back', () => {
    let s = createGame({
      seed: 4, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet: CARD_SET,
      players: [{ name: 'Ada', deck: deckSlugs(PREBUILT_DECKS[0]) }, { name: 'Bo', deck: deckSlugs(PREBUILT_DECKS[1]) }],
    })
    while (s.phase === 'bank') s = act(s, s.actorSeat, { type: 'skipResource' })
    const me = s.actorSeat, them = (1 - me) as Seat
    const a1 = put(s, me, 'hierophant', 1), a2 = put(s, me, 'hierophant', 1)   // 1/6 each — combined 2, the 3/3 survives
    const pal = put(s, them, 'dawnspear-paladin', 1)   // real 3/3
    s = act(s, me, { type: 'attack', attackers: [a1, a2], target: { kind: 'unit', id: pal } })
    expect(s.phase).toBe('block')
    s = act(s, them, { type: 'block', pairs: [] })
    expect(effPower(s, s.units[pal])).toBe(5)          // 3 + 2 attackers, this round
    expect(s.units[a1].damage + s.units[a2].damage).toBe(5)   // the buffed 5 struck back (base 3 before)
  })
})
