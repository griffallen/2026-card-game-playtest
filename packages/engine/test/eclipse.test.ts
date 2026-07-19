import { describe, expect, it } from 'vitest'
import type { CardDef, CardSet, GameState, Seat } from '../src/types.ts'
import { homeZone } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { runOps } from '../src/effects.ts'
import { validateCardSet } from '../src/validate.ts'
import { simulateGame } from '../src/simulate.ts'
import { assertConservation } from '../src/helpers.ts'
import { DEFAULT_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { put } from './util.ts'

// ── #122 Eclipse — the purple tempo-lock finisher ────────────────────────────────────────────────
// The rework folds THREE new engine pieces, resolved atomically on play in text order:
//   (a) lockPlays  — a per-seat, per-round flag; the single gate is getLegalActions (playCard also
//       rejects defensively). Only playing FROM HAND is blocked — attacks, moves, activate all stay.
//   (b) discardRandom — a seeded, inline discard (NOT a pending 'choose'); pulls from state.rngState,
//       the SAME threaded PRNG the shuffle uses, so replays stay bit-identical.
//   (c) draw upTo  — the draw op grows an `upTo` sibling: draw until the hand holds upTo cards
//       (measured live), honoring decision 33's empty-deck penalty like every other draw.

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) =>
  applyAction(s, a, seat).state

// A toy set: the REAL Eclipse (so its onPlay wiring is exercised) beside vanilla bodies + a
// no-target sneaker (its Sneak always offers an `activate`) so the gate test can prove board play survives.
const grunt: CardDef = { slug: 'grunt', name: 'grunt', color: 'red', type: 'unit', cost: 1, power: 2, health: 2, text: '' }
const sneaker: CardDef = {
  slug: 'sneaker', name: 'sneaker', color: 'red', type: 'unit', cost: 1, power: 2, health: 2, text: '',
  kw: [{ k: 'sneak' }], sneak: { ops: [{ op: 'influence', n: 1 }] },
}
const CS: CardSet = { eclipse: CARD_SET['eclipse'], grunt, sneaker }

let n = 8000
function toHand(s: GameState, seat: Seat, slug: string): string {
  const id = `eh${n++}`
  s.cardOf[id] = slug
  s.sides[seat].hand.push(id)
  return id
}
/** Ready resources — pipModel is 'none' under DEFAULT_RULES, so any slug fuels cost. */
function fuel(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `er${n++}`
    s.cardOf[id] = 'grunt'
    s.sides[seat].resources.push({ id, exhausted: false })
  }
}
/** Seed known cards on top of a deck (last element = top, popped first). Returns the ids. */
function seedDeck(s: GameState, seat: Seat, slugs: string[]): string[] {
  const ids: string[] = []
  for (const slug of slugs) {
    const id = `ed${n++}`
    s.cardOf[id] = slug
    s.sides[seat].deck.push(id)
    ids.push(id)
  }
  return ids
}

/** A no-effects loop state with empty hands/decks the test fills itself (pips off → always castable). */
function fresh(seed = 3): { s: GameState; me: Seat; them: Seat } {
  let s = createGame({
    seed,
    rules: { ...DEFAULT_RULES, chooseStartingResources: false, deckMinSize: 1, maxCopies: 40 },
    cardSet: CS,
    players: [{ name: 'Ada', deck: ['grunt'] }, { name: 'Bo', deck: ['grunt'] }],
  })
  while (s.phase === 'bank') s = act(s, s.actorSeat, { type: 'skipResource' })
  const me = s.actorSeat
  const them = (1 - me) as Seat
  s.sides[0].hand = []; s.sides[1].hand = []
  s.sides[0].deck = []; s.sides[1].deck = []
  return { s, me, them }
}

describe('#122 Eclipse compiles to the locked design', () => {
  it('type action, cost 7, three purple pips, three-op tempo lock', () => {
    const e = CARD_SET['eclipse']
    expect(e.type).toBe('action')
    expect(e.cost).toBe(7)
    expect(e.pips).toEqual(['purple', 'purple', 'purple'])
    expect(e.onPlay).toEqual([
      { op: 'lockPlays', who: 'opponent' },
      { op: 'discardRandom', who: 'opponent', n: 1 },
      { op: 'draw', upTo: 7 },
    ])
  })

  it('the whole real card set still validates clean', () => {
    expect(validateCardSet(CARD_SET)).toEqual([])
  })
})

describe('#122 (a) the lock — getLegalActions is the single gate, board plays survive', () => {
  it('a locked seat offers NO play actions; only plays vanish, every board action stays', () => {
    const { s, me, them } = fresh()
    // hand the opponent everything: a castable card (play), a mobile attacker in the enemy Home
    // (move + attack the base), a sneaker (activate). It is their action window.
    s.actorSeat = them
    toHand(s, them, 'grunt')
    fuel(s, them, 3)
    put(s, them, 'grunt', homeZone(me))       // in the enemy's Home: can move to Neutral AND strike the base
    put(s, them, 'sneaker', homeZone(them))   // no-target Sneak: always an `activate`

    const before = getLegalActions(s, them)
    expect(before.some(a => a.type === 'play')).toBe(true)
    expect(before.some(a => a.type === 'move')).toBe(true)
    expect(before.some(a => a.type === 'attack')).toBe(true)
    expect(before.some(a => a.type === 'activate')).toBe(true)

    // cast the lock the way Eclipse does: controller me, who:'opponent' → them is locked
    runOps({ state: s, controller: me, actorSeat: me }, [{ op: 'lockPlays', who: 'opponent' }])
    expect(s.cardPlayLock[them]).toBe(true)
    expect(s.cardPlayLock[me]).toBe(false)

    const after = getLegalActions(s, them)
    expect(after.some(a => a.type === 'play')).toBe(false)          // no hand-plays
    expect(after.some(a => a.type === 'move')).toBe(true)           // board still acts…
    expect(after.some(a => a.type === 'attack')).toBe(true)
    expect(after.some(a => a.type === 'activate')).toBe(true)
    expect(after.some(a => a.type === 'pass')).toBe(true)
    // the ONLY difference is the removed plays — nothing else shifted
    expect(after).toEqual(before.filter(a => a.type !== 'play'))
  })

  it('playCard rejects a locked seat even called directly — the defensive gate behind the legal filter', () => {
    const { s, me, them } = fresh()
    const card = toHand(s, them, 'grunt')
    fuel(s, them, 3)
    s.cardPlayLock[them] = true
    s.actorSeat = them
    expect(() => act(s, them, { type: 'play', card })).toThrow(/eclipse/i)
  })
})

describe('#122 (b) random discard — seeded, inline, no penalty', () => {
  it('is deterministic (same seed → same card) and lands in discard', () => {
    const build = () => {
      const { s, me, them } = fresh(11)
      const ids = ['grunt', 'sneaker', 'grunt', 'sneaker', 'grunt'].map(sl => toHand(s, them, sl))
      return { s, me, them, ids }
    }
    const a = build()
    const b = build()
    a.s.rngState = 123456
    b.s.rngState = 123456
    runOps({ state: a.s, controller: a.me, actorSeat: a.me }, [{ op: 'discardRandom', who: 'opponent', n: 1 }])
    runOps({ state: b.s, controller: b.me, actorSeat: b.me }, [{ op: 'discardRandom', who: 'opponent', n: 1 }])
    // same rngState → the SAME hand POSITION was pulled (instance ids differ between builds, the id
    // counter having advanced — position is the deterministic thing) and rngState threaded identically.
    const idxA = a.ids.findIndex(id => !a.s.sides[a.them].hand.includes(id))
    const idxB = b.ids.findIndex(id => !b.s.sides[b.them].hand.includes(id))
    expect(idxA).toBeGreaterThanOrEqual(0)
    expect(idxA).toBe(idxB)
    expect(a.s.rngState).toBe(b.s.rngState)
    expect(a.s.sides[a.them].discard).toContain(a.ids[idxA])   // the pulled card went to discard
    expect(a.s.sides[a.them].hand).toHaveLength(4)             // exactly one removed
    assertConservation(a.s)
  })

  it('an empty hand is a silent no-op — no discard, no decision-33 penalty', () => {
    const { s, me, them } = fresh()
    // them: no cards in hand
    const lifeBefore = s.sides[them].life
    const infBefore = s.influence
    const rngBefore = s.rngState
    runOps({ state: s, controller: me, actorSeat: me }, [{ op: 'discardRandom', who: 'opponent', n: 1 }])
    expect(s.sides[them].discard).toHaveLength(0)
    expect(s.sides[them].life).toBe(lifeBefore)   // a discard, NOT an empty draw — no penalty
    expect(s.influence).toBe(infBefore)
    expect(s.rngState).toBe(rngBefore)             // nothing pulled → the PRNG never advanced
    assertConservation(s)
  })
})

describe('#122 (c) draw upTo — fill the hand to a target, honoring the empty-deck penalty', () => {
  it('upTo:7 from a 3-card hand draws exactly 4', () => {
    const { s, me } = fresh()
    ;['grunt', 'grunt', 'grunt'].forEach(sl => toHand(s, me, sl))
    seedDeck(s, me, ['grunt', 'grunt', 'grunt', 'grunt', 'grunt', 'grunt'])   // 6 available
    runOps({ state: s, controller: me, actorSeat: me }, [{ op: 'draw', upTo: 7 }])
    expect(s.sides[me].hand).toHaveLength(7)
    expect(s.sides[me].deck).toHaveLength(2)   // 6 − 4 drawn
    assertConservation(s)
  })

  it('upTo:7 from an 8-card hand draws 0 — a clean no-op, never discards down', () => {
    const { s, me } = fresh()
    ;Array.from({ length: 8 }).forEach(() => toHand(s, me, 'grunt'))
    seedDeck(s, me, ['grunt', 'grunt', 'grunt'])
    const deckBefore = s.sides[me].deck.length
    runOps({ state: s, controller: me, actorSeat: me }, [{ op: 'draw', upTo: 7 }])
    expect(s.sides[me].hand).toHaveLength(8)   // untouched
    expect(s.sides[me].deck).toHaveLength(deckBefore)
    assertConservation(s)
  })

  it('upTo into a short deck over-draws to the target and eats the decision-33 penalty', () => {
    const { s, me } = fresh()
    ;['grunt', 'grunt'].forEach(sl => toHand(s, me, sl))   // hand 2, wants 5 more to reach 7
    seedDeck(s, me, ['grunt', 'grunt'])                    // deck holds only 2 → 3 whiff
    const lifeBefore = s.sides[me].life
    const infBefore = s.influence
    runOps({ state: s, controller: me, actorSeat: me }, [{ op: 'draw', upTo: 7 }])
    expect(s.sides[me].hand).toHaveLength(4)               // 2 held + 2 real draws
    expect(s.sides[me].deck).toHaveLength(0)
    // 3 missing cards each bill emptyDrawLifeLoss / emptyDrawInfluenceLoss (decision 33)
    expect(s.sides[me].life).toBe(lifeBefore - 3 * DEFAULT_RULES.emptyDrawLifeLoss)
    expect(s.influence).toBe(infBefore - 3 * DEFAULT_RULES.emptyDrawInfluenceLoss * (me === 0 ? 1 : -1))
    assertConservation(s)
  })

  it('an existing {op:draw,n} card is untouched — n ignores hand size, draws exactly n', () => {
    const { s, me } = fresh()
    ;['grunt', 'grunt', 'grunt', 'grunt', 'grunt'].forEach(sl => toHand(s, me, sl))   // already 5 in hand
    seedDeck(s, me, ['grunt', 'grunt', 'grunt', 'grunt'])
    runOps({ state: s, controller: me, actorSeat: me }, [{ op: 'draw', n: 3 }])
    expect(s.sides[me].hand).toHaveLength(8)   // 5 + 3 — n never measures the hand
    expect(s.sides[me].deck).toHaveLength(1)
    assertConservation(s)
  })
})

describe('#122 Eclipse end-to-end — atomic lock → discard → draw, and the round boundary lifts the lock', () => {
  it('one play folds all three pieces and conservation holds', () => {
    const { s, me, them } = fresh()
    const eclipse = toHand(s, me, 'eclipse')
    fuel(s, me, 7)
    // the opponent holds 3 cards (one is discarded at random) and has a filler deck
    ;['grunt', 'sneaker', 'grunt'].forEach(sl => toHand(s, them, sl))
    seedDeck(s, me, Array.from({ length: 10 }, () => 'grunt'))   // deep enough to fill me to 7 penalty-free
    const themHandBefore = s.sides[them].hand.length

    const after = act(s, me, { type: 'play', card: eclipse })
    expect(after.cardPlayLock[them]).toBe(true)
    expect(after.cardPlayLock[me]).toBe(false)
    expect(after.sides[them].hand).toHaveLength(themHandBefore - 1)   // one discarded at random
    expect(after.sides[them].discard).toHaveLength(1)
    expect(after.sides[me].hand).toHaveLength(7)                      // filled to 7 (Eclipse itself already gone)
    expect(after.sides[me].discard).toContain(eclipse)               // the action resolved into discard
    assertConservation(after)
  })

  it('the lock clears at the round boundary — the opponent may play again next round', () => {
    let s = fresh().s
    const me = s.actorSeat
    const them = (1 - me) as Seat
    // filler decks so the start-step draws never bill the empty-deck penalty
    seedDeck(s, me, Array.from({ length: 12 }, () => 'grunt'))
    seedDeck(s, them, Array.from({ length: 12 }, () => 'grunt'))
    runOps({ state: s, controller: me, actorSeat: me }, [{ op: 'lockPlays', who: 'opponent' }])
    expect(s.cardPlayLock[them]).toBe(true)

    // pass the round out; endRound resets the lock at the same boundary as homeWard ("this Round")
    const r0 = s.round
    let guard = 0
    while (s.round === r0 && guard++ < 30) s = act(s, s.actorSeat, { type: 'pass' })
    expect(s.round).toBe(r0 + 1)
    expect(s.cardPlayLock).toEqual([false, false])

    // drive out of the new round's start step, then prove the gate reopened for the opponent
    while (s.phase === 'bank') s = act(s, s.actorSeat, { type: 'skipResource' })
    s.actorSeat = them
    const card = toHand(s, them, 'grunt')
    fuel(s, them, 3)
    expect(getLegalActions(s, them).some(a => a.type === 'play' && a.card === card)).toBe(true)
  })
})

describe('#122 determinism + conservation under full simulation', () => {
  // Eclipse is exercised at a sim-only reduced cost so the heuristic policy actually reaches it every
  // game (cost 7 at 1 resource/round would rarely fire in a short playout). simulateGame asserts
  // conservation every step; same seed must reproduce bit-for-bit — the discardRandom rng threading proves out here.
  const V: CardSet = {
    eclipse: { ...CARD_SET['eclipse'], cost: 1 },
    grunt: { slug: 'grunt', name: 'grunt', color: 'red', type: 'unit', cost: 2, power: 2, health: 2, text: '' } satisfies CardDef,
    ram: { slug: 'ram', name: 'ram', color: 'red', type: 'unit', cost: 3, power: 3, health: 3, text: '' } satisfies CardDef,
  }
  const RULES = { ...DEFAULT_RULES, deckMinSize: 8, maxCopies: 40 }
  const deck = () => Object.keys(V).flatMap(slug => [slug, slug, slug, slug, slug])

  it('20 seeded games that play Eclipse terminate with a winner, both seat orders', { timeout: 60_000 }, () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = simulateGame(seed, deck(), deck(), { rules: RULES, cardSet: V, policyA: 'heuristic', policyB: 'heuristic' })
      expect(r.winner === 0 || r.winner === 1).toBe(true)
    }
  })

  it('same seed → identical game (the seeded discard preserves replay determinism)', () => {
    const x = simulateGame(42, deck(), deck(), { rules: RULES, cardSet: V, policyA: 'heuristic', policyB: 'random' })
    const y = simulateGame(42, deck(), deck(), { rules: RULES, cardSet: V, policyA: 'heuristic', policyB: 'random' })
    expect(x).toEqual(y)
  })
})
