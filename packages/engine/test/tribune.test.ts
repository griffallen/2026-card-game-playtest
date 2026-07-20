import { describe, it, expect } from 'vitest'
import type { CardSet, GameState, Seat, GameAction } from '../src/types.ts'
import { homeZone } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put, fuel, toHand } from './util.ts'

// Tribune (#125 — decision 115; renamed from Politician). Two independent parts:
//  A) the round-end MAJORITY payout (#104 rework — decision 88, UNCHANGED by #125): count P = your
//     tribunes; Neutral majority → +1 × P; enemy-Home majority → +2 × P; both stack (up to +3 × P).
//  B) the cause-blind ±1 INFLUENCE SWING (new #125 primitive): +1 to the controller on EVERY
//     enter-play (deploy, created copy, return-from-capture) and −1 on EVERY leave-play (defeat,
//     capture). It keys off the event, not the reason — over a Tribune's life it nets to zero and
//     cannot be farmed (capture −1 + release +1 cancel).
const K: CardSet = {
  ...T,
  // the tribune under test (purple diplomat body, 1/3)
  senator: { slug: 'senator', name: 'senator', color: 'purple', type: 'unit', cost: 1, power: 1, health: 3, text: '', kw: [{ k: 'tribune' }] },
  // a plain non-tribune unit that also plays from hand (control)
  clerk: { slug: 'clerk', name: 'clerk', color: 'purple', type: 'unit', cost: 1, power: 1, health: 3, text: '' },
  // a captor: on entering play it takes the chosen enemy unit under itself (sourceUnit = the captor)
  captor: { slug: 'captor', name: 'captor', color: 'purple', type: 'unit', cost: 1, power: 2, health: 2, text: '',
    targets: [{ t: 'unit', side: 'enemy' }], onPlay: [{ op: 'capture', t: 'chosen0' }] },
  // a burn that kills anything the test points it at (5 damage to a chosen unit, either side)
  smite: { slug: 'smite', name: 'smite', color: 'red', type: 'action', cost: 1, text: '',
    targets: [{ t: 'unit', side: 'any' }], onPlay: [{ op: 'damage', t: 'chosen0', n: 5 }] },
  // Absolution-style jailbreak: free the controller's OWN captured units (freeCaptives)
  absolver: { slug: 'absolver', name: 'absolver', color: 'yellow', type: 'action', cost: 1, text: '',
    onPlay: [{ op: 'freeCaptives' }] },
  // a Tribune that raises two Tribune copies of itself on entry (ifOnlyCopy fuse — like Radiant Citadel)
  founder: { slug: 'founder', name: 'founder', color: 'yellow', type: 'unit', cost: 1, power: 1, health: 3, text: '',
    kw: [{ k: 'tribune' }], onPlay: [{ op: 'createCopies', n: 2, ifOnlyCopy: true }] },
}

function v3game(): GameState {
  let s = createGame({
    seed: 111,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: K,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}
const inf = (s: GameState, seat: Seat) => (seat === 0 ? s.influence : -s.influence)
const act = (s: GameState, a: GameAction) => applyAction(s, a, s.actorSeat).state
/** Play a card FROM HAND as the current actor (fuels the cost first). */
function playFromHand(s: GameState, seat: Seat, slug: string, targets?: { kind: 'unit'; id: string }[]): GameState {
  const id = toHand(s, seat, slug)
  fuel(s, seat, K[slug].cost)
  return act(s, { type: 'play', card: id, ...(targets ? { targets } : {}) })
}
function endRoundByPasses(s: GameState): GameState {
  let n = applyAction(s, { type: 'pass' }, s.actorSeat).state
  return applyAction(n, { type: 'pass' }, n.actorSeat).state
}

// ─── Part B: the ±1 influence swing (#125) ─────────────────────────────────────
describe('Tribune influence swing (#125): cause-blind ±1 on enter/leave of play', () => {
  it('+1 to the controller when a Tribune is deployed from hand', () => {
    const s = v3game()
    const me = s.actorSeat
    const before = inf(s, me)
    const after = playFromHand(s, me, 'senator')
    expect(inf(after, me) - before).toBe(1)
  })

  it('a non-Tribune deployed from hand never moves the track (control)', () => {
    const s = v3game()
    const me = s.actorSeat
    const before = inf(s, me)
    const after = playFromHand(s, me, 'clerk')
    expect(inf(after, me) - before).toBe(0)
  })

  it('X Tribunes entering at once → +X (a founder raises two Tribune copies: parent +1, copies +1 each = +3)', () => {
    const s = v3game()
    const me = s.actorSeat
    const before = inf(s, me)
    const after = playFromHand(s, me, 'founder')
    // parent enters (+1) and its two ifOnlyCopy copies enter (+1 each) — the copies do NOT re-spawn
    expect(inf(after, me) - before).toBe(3)
  })

  it('−1 to the controller when a Tribune is defeated', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    put(s, them, 'senator', homeZone(them))     // their Tribune, placed directly (no enter swing)
    const before = inf(s, them)
    const target = Object.values(s.units).find(u => u.owner === them && u.slug === 'senator')!.id
    const after = playFromHand(s, me, 'smite', [{ kind: 'unit', id: target }])
    expect(inf(after, them) - before).toBe(-1)   // their Tribune fell → the marker slides toward me
  })

  it('net zero over deploy → defeat', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    const before = inf(s, me)
    const s1 = playFromHand(s, me, 'senator')     // +1 on deploy
    expect(inf(s1, me) - before).toBe(1)
    const senator = Object.values(s1.units).find(u => u.owner === me && u.slug === 'senator')!.id
    const s2 = playFromHand(s1, them, 'smite', [{ kind: 'unit', id: senator }])  // them's turn: kill it (−1)
    expect(inf(s2, me) - before).toBe(0)          // over its whole life the swing nets to zero
  })

  it('−1 when a Tribune is captured (a leave that is NOT death)', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    put(s, them, 'senator', homeZone(them))
    const senator = Object.values(s.units).find(u => u.owner === them && u.slug === 'senator')!.id
    const before = inf(s, them)
    const after = playFromHand(s, me, 'captor', [{ kind: 'unit', id: senator }])
    expect(after.captives[senator]).toBeTruthy()          // it is held, off the board
    expect(after.units[senator]).toBeUndefined()          // …and no longer on it
    expect(inf(after, them) - before).toBe(-1)            // leaving play cost its owner 1
  })

  it('+1 when the captured Tribune returns as its captor falls — net zero over capture → release', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    put(s, them, 'senator', homeZone(them))
    const senator = Object.values(s.units).find(u => u.owner === them && u.slug === 'senator')!.id
    const before = inf(s, them)
    let g = playFromHand(s, me, 'captor', [{ kind: 'unit', id: senator }])   // capture: them −1
    expect(inf(g, them) - before).toBe(-1)
    const captor = Object.values(g.units).find(u => u.owner === me && u.slug === 'captor')!.id
    g = act(g, { type: 'pass' })                                            // hand the turn back to me
    g = playFromHand(g, me, 'smite', [{ kind: 'unit', id: captor }])        // kill the captor → release
    expect(g.units[senator]).toBeTruthy()                                   // the Tribune is back in play
    expect(inf(g, them) - before).toBe(0)                                   // release +1 cancels the capture −1
  })

  it('+1 when a captured Tribune returns via freeCaptives (Absolution path)', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    put(s, them, 'senator', homeZone(them))
    const senator = Object.values(s.units).find(u => u.owner === them && u.slug === 'senator')!.id
    const before = inf(s, them)
    let g = playFromHand(s, me, 'captor', [{ kind: 'unit', id: senator }])   // capture: them −1
    expect(inf(g, them) - before).toBe(-1)
    g = playFromHand(g, them, 'absolver')                                    // them frees their own captive
    expect(g.units[senator]).toBeTruthy()
    expect(inf(g, them) - before).toBe(0)                                    // freeCaptives return = +1
  })

  it('the swing stacks ON TOP of the round-end majority payout', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as Seat
    put(s, me, 'senator', 1)
    put(s, me, 'senator', 1)                 // two Tribunes hold the Neutral majority (placed, no swing)
    put(s, them, 'pawn', 1)                  // enemy 1 in Neutral → I lead 2 vs 1
    const before = inf(s, me)
    let g = playFromHand(s, me, 'senator')   // deploy a THIRD Tribune (to home): +1 enter swing, P → 3
    expect(inf(g, me) - before).toBe(1)      // the enter swing landed immediately
    g = endRoundByPasses(g)                  // round end: Neutral majority with P=3 → +3 majority payout
    expect(inf(g, me) - before).toBe(4)      // +1 (enter swing) + 3 (majority) — the two stack
  })
})

// ─── Part A: the round-end majority payout (#104 rework — UNCHANGED by #125) ────
describe('Tribune majority payout (#104 rework — per-tribune, two zones)', () => {
  const setup = () => {
    const s = v3game()
    return { s, me: s.actorSeat, them: (1 - s.actorSeat) as Seat }
  }
  it('2 Tribunes + Neutral majority → +2 (scales per tribune)', () => {
    const { s, me, them } = setup()
    put(s, me, 'senator', 1)
    put(s, me, 'senator', 1)                    // 2 of my units in Neutral (both tribunes)
    put(s, them, 'pawn', 1)                     // enemy has 1 there → I hold the majority
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(2)     // +1 × 2 tribunes
  })

  it('Neutral majority AND enemy-Home majority → +6 (2×1 + 2×2)', () => {
    const { s, me, them } = setup()
    put(s, me, 'senator', 1)
    put(s, me, 'senator', 1)                    // P = 2, Neutral majority (2 vs 0)
    put(s, me, 'pawn', homeZone(them))          // 1 of my units in the enemy's Home (0 enemy there) → majority
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(6)     // Neutral 2×1 + enemy-Home 2×2 = 2 + 4
  })

  it('3 Tribunes, Neutral majority only → +3', () => {
    const { s, me, them } = setup()
    put(s, me, 'senator', 1)
    put(s, me, 'senator', 1)
    put(s, me, 'senator', 1)                    // P = 3, all in Neutral
    put(s, them, 'pawn', 1)                     // enemy 1 there → still my majority
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(3)     // 3 tribunes × +1 for the single Neutral majority
  })

  it('no majority anywhere → nothing', () => {
    const { s, me, them } = setup()
    put(s, me, 'senator', 1)                    // 1 tribune in Neutral…
    put(s, them, 'pawn', 1)
    put(s, them, 'pawn', 1)                     // …but the enemy holds Neutral 2 vs 1 — I have no majority
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(0)
  })

  it('a tie in a zone is not a majority — no gain there', () => {
    const { s, me, them } = setup()
    put(s, me, 'senator', 1)
    put(s, them, 'pawn', 1)                     // Neutral tied 1-1 → not a majority
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(0)
  })

  it('majority without any tribune earns nothing', () => {
    const { s, me } = setup()
    put(s, me, 'pawn', 1)
    put(s, me, 'pawn', 1)                       // Neutral majority, but no tribune to press it
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(0)
  })

  it('a tribune in your OWN Home cashes nothing on its own — only Neutral and the enemy Home pay', () => {
    const { s, me } = setup()
    put(s, me, 'senator', homeZone(me))         // trivially the majority at home, but home never pays
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(0)
  })

  it('⚑ LITERAL reading: a tribune standing at home still cashes a Neutral majority won by other units', () => {
    // Under the built (literal) rule, P counts the home-bound senator and the two pawns give the
    // Neutral majority → +1 × 1. Under an alternative "the tribune must STAND in Neutral" reading
    // this would be 0. If Griff wants the positional rule, flip this.
    const { s, me, them } = setup()
    put(s, me, 'senator', homeZone(me))         // the only tribune — NOT in Neutral
    put(s, me, 'pawn', 1)
    put(s, me, 'pawn', 1)                       // two non-tribunes win the Neutral majority (2 vs 0)
    put(s, them, 'pawn', 1)                     // enemy 1 in Neutral → I still lead 2 vs 1
    const before = inf(s, me)
    const after = endRoundByPasses(s)
    expect(inf(after, me) - before).toBe(1)     // literal: P(=1) × +1 Neutral majority
  })
})
