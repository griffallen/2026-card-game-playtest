import { describe, expect, it } from 'vitest'
import type { CardDef, CardSet, GameState, Seat } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { validateCardSet } from '../src/validate.ts'
import { effPower, influenceFor } from '../src/helpers.ts'
import { T, toyDeck, put, toHand } from './util.ts'

// ── #107 Warpath — the Influence-track pump ──────────────────────────────────
// Locked spec (Griff, #107; tuning session 013): cost 0. X = your current Influence.
//   • Each of your units gets +floor(|X| / 2) Power THIS ROUND (half, rounded down — a positive
//     pump whether you're ahead or behind).
//   • If X > 0 you pay the FULL magnitude in life; if X < 0 your opponent gains 1 Influence
//     (no life paid); at X = 0 it is a clean no-op.
// Wiring: a per:{count:'influence',half?} count (live |Influence|, optionally floored-half) feeds
//   the board buff and the self-life damage; a `cond` on the damage op gates the life price to
//   "while ahead". The negative branch is an influence op that cedes 1 while behind.

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state
const setInf = (s: GameState, seat: Seat, v: number) => { s.influence = seat === 0 ? v : -v }

// toy Warpath: same onPlay as the real card but no pips (skips the presence gate in the toy path)
const WARPATH_OPS: CardDef['onPlay'] = [
  { op: 'buff', t: { side: 'friendly' }, p: 1, dur: 'round', per: { count: 'influence', half: true } },
  { op: 'damage', t: 'selfBase', n: 1, per: { count: 'influence' }, cond: { influenceAtLeast: 1 } },
  { op: 'influence', n: -1, cond: { influenceAtMost: -1 } },
]
const WP: CardSet = {
  ...T,
  warpath: { slug: 'warpath', name: 'warpath', color: 'red', type: 'action', cost: 0, text: '', onPlay: WARPATH_OPS },
}

function wpGame(seed = 7): GameState {
  let s = createGame({
    seed,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: WP,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = act(s, s.actorSeat, { type: 'skipResource' })
  return s
}

describe('Warpath (#107): half-Influence board pump, sign-flipped price', () => {
  it('ahead on Influence: +floor(X/2) Power to every one of your units, full-X life cost', () => {
    let s = wpGame()
    const me = s.actorSeat, them = (1 - me) as Seat
    const a = put(s, me, 'soldier', 1)   // 2/2
    const b = put(s, me, 'brute', 1)     // 4/3
    const foe = put(s, them, 'pawn', 1)  // 1/1 enemy — must be untouched
    setInf(s, me, 6)
    const life0 = s.sides[me].life
    const wp = toHand(s, me, 'warpath')
    s = act(s, me, { type: 'play', card: wp })
    expect(effPower(s, s.units[a])).toBe(2 + 3)   // half of 6 = +3, this round
    expect(effPower(s, s.units[b])).toBe(4 + 3)
    expect(effPower(s, s.units[foe])).toBe(1)     // the enemy never gets the pump
    expect(s.sides[me].life).toBe(life0 - 6)      // full magnitude paid in life
    expect(influenceFor(s, me)).toBe(6)           // ahead branch: no influence swing
  })

  it('odd Influence floors the half: +5 → +2 to the board', () => {
    let s = wpGame()
    const me = s.actorSeat
    const a = put(s, me, 'soldier', 1)   // 2/2
    setInf(s, me, 5)
    const life0 = s.sides[me].life
    const wp = toHand(s, me, 'warpath')
    s = act(s, me, { type: 'play', card: wp })
    expect(effPower(s, s.units[a])).toBe(2 + 2)   // floor(5/2) = 2
    expect(s.sides[me].life).toBe(life0 - 5)      // full 5 life
  })

  it('behind on Influence: still +floor(|X|/2) Power, opponent gains 1 Influence, no life paid', () => {
    let s = wpGame()
    const me = s.actorSeat, them = (1 - me) as Seat
    const a = put(s, me, 'soldier', 1)   // 2/2
    setInf(s, me, -4)
    const life0 = s.sides[me].life
    const themBefore = influenceFor(s, them)
    const wp = toHand(s, me, 'warpath')
    s = act(s, me, { type: 'play', card: wp })
    expect(effPower(s, s.units[a])).toBe(2 + 2)          // half of |−4| = +2
    expect(s.sides[me].life).toBe(life0)                 // behind → no life price
    expect(influenceFor(s, them)).toBe(themBefore + 1)   // opponent gains exactly 1
    expect(influenceFor(s, me)).toBe(-5)
  })

  it('exactly 0 Influence: a clean no-op — no buff, no life, no influence swing', () => {
    let s = wpGame()
    const me = s.actorSeat
    const a = put(s, me, 'soldier', 1)   // 2/2
    setInf(s, me, 0)
    const life0 = s.sides[me].life
    const wp = toHand(s, me, 'warpath')
    s = act(s, me, { type: 'play', card: wp })
    expect(effPower(s, s.units[a])).toBe(2)      // no buff
    expect(s.sides[me].life).toBe(life0)         // no life
    expect(influenceFor(s, me)).toBe(0)          // no swing
  })

  it('the floor edge at +1: half of 1 rounds down to 0 — no Power, but still 1 life paid', () => {
    let s = wpGame()
    const me = s.actorSeat
    const a = put(s, me, 'soldier', 1)   // 2/2
    setInf(s, me, 1)
    const life0 = s.sides[me].life
    const wp = toHand(s, me, 'warpath')
    s = act(s, me, { type: 'play', card: wp })
    expect(effPower(s, s.units[a])).toBe(2)       // floor(1/2) = 0, no pump
    expect(s.sides[me].life).toBe(life0 - 1)      // still the full-magnitude life price
  })

  it('the Power pump is THIS ROUND only — it resets to base next round', () => {
    let s = wpGame()
    const me = s.actorSeat
    const a = put(s, me, 'brute', 1)     // 4/3
    setInf(s, me, 6)
    const wp = toHand(s, me, 'warpath')
    s = act(s, me, { type: 'play', card: wp })
    expect(effPower(s, s.units[a])).toBe(4 + 3)
    // roll the round over: two consecutive passes end it
    s = act(s, s.actorSeat, { type: 'pass' })
    s = act(s, s.actorSeat, { type: 'pass' })
    expect(s.round).toBeGreaterThan(1)
    expect(effPower(s, s.units[a])).toBe(4)       // round-scoped pump expired
  })
})

// ── the real compiled card ───────────────────────────────────────────────────
function arena(seed = 21) {
  let s = createGame({
    seed,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: CARD_SET,
    players: [
      { name: 'Ada', deck: deckSlugs(PREBUILT_DECKS[0]) },
      { name: 'Bo', deck: deckSlugs(PREBUILT_DECKS[1]) },
    ],
  })
  while (s.phase === 'bank') s = act(s, s.actorSeat, { type: 'skipResource' })
  const me = s.actorSeat, them = (1 - me) as Seat
  // bank a real red-pip source so the presence gate lets Warpath fire
  for (let i = 0; i < 3; i++) {
    const id = `wr${1000 + i}`
    s.cardOf[id] = 'cinder-initiate'   // pips [red]
    s.sides[me].resources.push({ id, exhausted: false })
  }
  return { s, me, them }
}

describe('Warpath (#107): the real compiled card', () => {
  it('compiles to the locked design: action, cost 0, one red pip, the exact onPlay chain', () => {
    const def = CARD_SET['warpath']
    expect(def.type).toBe('action')
    expect(def.cost).toBe(0)
    expect(def.pips).toEqual(['red'])
    expect(def.onPlay).toEqual(WARPATH_OPS)
    expect(def.text).toContain('half of X')
    expect(def.text).toContain('lose X life')
    expect(def.text).toContain('opponent gains 1 Hope')
    expect(validateCardSet(CARD_SET)).toEqual([])
  })

  it('live arena, ahead: half the board pump and the full life price', () => {
    let { s, me } = arena()
    const c1 = put(s, me, 'cinder-initiate', 1)   // 2/1
    const c2 = put(s, me, 'berserker', 1)
    const p1 = effPower(s, s.units[c1]), p2 = effPower(s, s.units[c2])
    setInf(s, me, 6)
    const life0 = s.sides[me].life
    const wp = toHand(s, me, 'warpath')
    s = act(s, me, { type: 'play', card: wp })
    expect(effPower(s, s.units[c1])).toBe(p1 + 3)
    expect(effPower(s, s.units[c2])).toBe(p2 + 3)
    expect(s.sides[me].life).toBe(life0 - 6)
    expect(influenceFor(s, me)).toBe(6)
  })

  it('live arena, behind: the board still pumps and the opponent gains 1 Influence, no life paid', () => {
    let { s, me, them } = arena(30)
    const c1 = put(s, me, 'cinder-initiate', 1)   // 2/1
    const p1 = effPower(s, s.units[c1])
    setInf(s, me, -4)
    const life0 = s.sides[me].life
    const themBefore = influenceFor(s, them)
    const wp = toHand(s, me, 'warpath')
    s = act(s, me, { type: 'play', card: wp })
    expect(effPower(s, s.units[c1])).toBe(p1 + 2)
    expect(s.sides[me].life).toBe(life0)
    expect(influenceFor(s, them)).toBe(themBefore + 1)
  })
})
