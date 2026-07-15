import { describe, it, expect } from 'vitest'
import type { CardSet, GameState, Seat } from '../src/types.ts'
import { homeZone } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { influenceFor } from '../src/helpers.ts'
import { T, toyDeck, put, fuel, toHand } from './util.ts'

// Decision 104 (Griff, #71): life and influence are uncapped VALUES — they just trigger effects.
// Gain as much life as you like; an attack can read the base at negative — and at that instant you
// lose. Influence is never clamped to the win band; only the threshold ends the game.

const TT: CardSet = {
  ...T,
  surge: { slug: 'surge', name: 'surge', color: 'yellow', type: 'action', cost: 1, text: '', onPlay: [{ op: 'influence', n: 5 }] },
}

function g(seed = 21): GameState {
  let s = createGame({
    seed, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet: TT,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}
const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

describe('decision 104: no caps on life or influence', () => {
  it('a base can be driven below 0, and the life loss fires at that instant', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as Seat
    const enemyHome = homeZone(them)
    const a1 = put(s, me, 'brute', enemyHome)       // 4 power
    s.sides[them].life = 2                           // 4 damage will overshoot to -2
    s = act(s, me, { type: 'attack', attackers: [a1], target: { kind: 'base', seat: them } })
    if (s.phase === 'block') s = act(s, them, { type: 'block', pairs: [] })
    expect(s.sides[them].life).toBe(-2)              // stored life reads negative — not clamped to 0
    expect(s.winner).toBe(me)
    expect(s.winReason).toBe('life')
  })

  it('overheal: life climbs past starting life with no ceiling', () => {
    let s = g()
    const me = s.actorSeat
    fuel(s, me, 5)
    s.sides[me].life = 20                            // already at starting
    const heal = { slug: 'mend', name: 'mend', color: 'yellow' as const, type: 'action' as const, cost: 1, text: '', onPlay: [{ op: 'heal' as const, t: 'selfBase' as const, n: 6 }] }
    s.cardSet = { ...s.cardSet, mend: heal }
    const card = toHand(s, me, 'mend')
    s = act(s, me, { type: 'play', card, targets: [] })
    expect(s.sides[me].life).toBe(26)               // 20 + 6, uncapped
  })

  it('influence is stored past the win band, and the win still fires at the threshold', () => {
    let s = g()
    const me = s.actorSeat
    fuel(s, me, 5)
    s.influence = me === 0 ? 14 : -14                // one below the 15 threshold, from me's side
    const card = toHand(s, me, 'surge')
    s = act(s, me, { type: 'play', card, targets: [] })
    expect(influenceFor(s, me)).toBe(19)            // +5 overshoots to 19 — NOT clamped to 15
    expect(s.winner).toBe(me)
    expect(s.winReason).toBe('influence')
  })
})
