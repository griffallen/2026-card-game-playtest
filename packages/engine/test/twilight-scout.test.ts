import { describe, expect, it } from 'vitest'
import type { CardDef, CardSet, GameState, Seat } from '../src/types.ts'
import { homeZone } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { runOps } from '../src/effects.ts'
import { viewFor } from '../src/view.ts'
import { validateCardSet } from '../src/validate.ts'
import { simulateGame } from '../src/simulate.ts'
import { assertConservation } from '../src/helpers.ts'
import { DEFAULT_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'

// ── #122 Twilight Scout — the one-time hand peek ────────────────────────────────────────────────
// The rework grounds the 2/3 Infiltrate scout to a 1/1, KEEPS Infiltrate, and adds a NEW engine op:
//   revealHand — on resolve it flips NO live flag. It pushes a FROZEN SNAPSHOT onto a new append-only
//   ledger, state.reveals: { seat (who may LOOK = the caster), hand (the OTHER seat's slugs captured
//   NOW), round }. Plain data (slugs, not instance ids), no rng — so the "one-time peek" falls out for
//   free: the caster sees that instant, not the hand as it later changes. viewFor exposes only the
//   entries addressed to the viewer, so the peek is the caster's alone. The omniscient AI already sees
//   every hand, so it's a deliberate no-op headless (the point is human-only info).

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) =>
  applyAction(s, a, seat).state

// A toy set: the REAL Twilight Scout (so its onPlay wiring is exercised) beside vanilla bodies.
const grunt: CardDef = { slug: 'grunt', name: 'grunt', color: 'red', type: 'unit', cost: 1, power: 2, health: 2, text: '' }
const spark: CardDef = { slug: 'spark', name: 'spark', color: 'red', type: 'unit', cost: 1, power: 1, health: 1, text: '' }
const CS: CardSet = { 'twilight-scout': CARD_SET['twilight-scout'], grunt, spark }

let n = 9000
function toHand(s: GameState, seat: Seat, slug: string): string {
  const id = `ts${n++}`
  s.cardOf[id] = slug
  s.sides[seat].hand.push(id)
  return id
}
/** Ready resources — pipModel is 'none' under DEFAULT_RULES, so any slug fuels cost. */
function fuel(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `tr${n++}`
    s.cardOf[id] = 'grunt'
    s.sides[seat].resources.push({ id, exhausted: false })
  }
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

describe('#122 Twilight Scout compiles to the locked design', () => {
  it('a 1/1 Infiltrate unit whose onPlay peeks the opponent hand', () => {
    const c = CARD_SET['twilight-scout']
    expect(c.type).toBe('unit')
    expect(c.cost).toBe(2)
    expect(c.power).toBe(1)
    expect(c.health).toBe(1)
    expect((c.kw ?? []).map(k => k.k)).toEqual(['infiltrate'])
    expect(c.onPlay).toEqual([{ op: 'revealHand', who: 'opponent' }])
  })

  it('the whole real card set still validates clean', () => {
    expect(validateCardSet(CARD_SET)).toEqual([])
  })
})

describe('#122 revealHand — a frozen snapshot addressed to the caster', () => {
  it('pushes ONE reveal entry capturing the opponent hand slugs, in order', () => {
    const { s, me, them } = fresh()
    ;['grunt', 'spark', 'grunt'].forEach(sl => toHand(s, them, sl))
    const expected = s.sides[them].hand.map(id => s.cardOf[id])

    const rngBefore = s.rngState
    runOps({ state: s, controller: me, actorSeat: me }, [{ op: 'revealHand', who: 'opponent' }])

    expect(s.reveals).toHaveLength(1)
    const entry = s.reveals[0]
    expect(entry.seat).toBe(me)          // the CASTER is the one who may look
    expect(entry.hand).toEqual(expected) // the opponent's exact current slugs, captured now
    expect(entry.round).toBe(s.round)
    expect(s.rngState).toBe(rngBefore)   // no rng touched — fully replay-derived
    assertConservation(s)
  })

  it('the snapshot is FROZEN — untouched after the opponent later draws / discards / plays', () => {
    const { s, me, them } = fresh()
    ;['grunt', 'spark'].forEach(sl => toHand(s, them, sl))
    runOps({ state: s, controller: me, actorSeat: me }, [{ op: 'revealHand', who: 'opponent' }])
    const snapshot = [...s.reveals[0].hand]

    // the opponent's hand churns afterward: a new draw arrives, an old card leaves
    toHand(s, them, 'grunt')
    s.sides[them].hand.shift()

    expect(s.reveals[0].hand).toEqual(snapshot)  // the ledger entry never moved
  })

  it('viewFor exposes the peek to the CASTER only — never the opponent, never a spectator', () => {
    const { s, me, them } = fresh()
    ;['grunt', 'spark'].forEach(sl => toHand(s, them, sl))
    runOps({ state: s, controller: me, actorSeat: me }, [{ op: 'revealHand', who: 'opponent' }])

    expect(viewFor(s, me).reveals).toHaveLength(1)
    expect(viewFor(s, me).reveals[0].hand).toEqual(s.sides[them].hand.map(id => s.cardOf[id]))
    expect(viewFor(s, them).reveals).toHaveLength(0)   // the opponent can't see their hand was read
    expect(viewFor(s, null).reveals).toHaveLength(0)   // spectator sees nothing
  })

  it('who:controller peeks the caster own hand (validator allows it; still caster-addressed)', () => {
    const { s, me } = fresh()
    ;['grunt', 'spark', 'grunt'].forEach(sl => toHand(s, me, sl))
    const expected = s.sides[me].hand.map(id => s.cardOf[id])
    runOps({ state: s, controller: me, actorSeat: me }, [{ op: 'revealHand', who: 'controller' }])
    expect(s.reveals).toHaveLength(1)
    expect(s.reveals[0].seat).toBe(me)
    expect(s.reveals[0].hand).toEqual(expected)
  })
})

describe('#122 Twilight Scout end-to-end — playing the real card fires the peek', () => {
  it('deploying the scout (Infiltrate) snapshots the opponent hand and lands a 1/1', () => {
    const { s, me, them } = fresh()
    const scout = toHand(s, me, 'twilight-scout')
    fuel(s, me, 2)
    ;['grunt', 'spark', 'grunt'].forEach(sl => toHand(s, them, sl))
    const expected = s.sides[them].hand.map(id => s.cardOf[id])

    // Infiltrate deploys to any zone — drop it into the opponent's Home
    const after = act(s, me, { type: 'play', card: scout, zone: homeZone(them) })

    expect(after.reveals).toHaveLength(1)
    expect(after.reveals[0].seat).toBe(me)
    expect(after.reveals[0].hand).toEqual(expected)

    const unit = Object.values(after.units).find(u => u.slug === 'twilight-scout')!
    expect(unit.owner).toBe(me)
    expect(unit.zone).toBe(homeZone(them))
    assertConservation(after)
  })
})

describe('#122 determinism + conservation under full simulation (no-op headless)', () => {
  // Twilight Scout is a vanilla 1/1 Infiltrate body to the omniscient bot — revealHand scores 0 and
  // has no headless effect. simulateGame asserts conservation every step; a seeded game must reproduce
  // bit-for-bit. FLAG: this is exactly why the sim UNDERVALUES the card — its whole point is human-only info.
  const V: CardSet = {
    'twilight-scout': CARD_SET['twilight-scout'],
    grunt: { slug: 'grunt', name: 'grunt', color: 'red', type: 'unit', cost: 2, power: 2, health: 2, text: '' },
    ram: { slug: 'ram', name: 'ram', color: 'red', type: 'unit', cost: 3, power: 3, health: 3, text: '' },
  }
  const RULES = { ...DEFAULT_RULES, deckMinSize: 8, maxCopies: 40 }
  const deck = () => Object.keys(V).flatMap(slug => [slug, slug, slug, slug, slug])

  it('20 seeded games that play Twilight Scout terminate with a winner', { timeout: 60_000 }, () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = simulateGame(seed, deck(), deck(), { rules: RULES, cardSet: V, policyA: 'heuristic', policyB: 'heuristic' })
      expect(r.winner === 0 || r.winner === 1).toBe(true)
    }
  })

  it('same seed → identical game (the peek pushes plain data, never touches rng)', () => {
    const x = simulateGame(42, deck(), deck(), { rules: RULES, cardSet: V, policyA: 'heuristic', policyB: 'random' })
    const y = simulateGame(42, deck(), deck(), { rules: RULES, cardSet: V, policyA: 'heuristic', policyB: 'random' })
    expect(x).toEqual(y)
  })
})
