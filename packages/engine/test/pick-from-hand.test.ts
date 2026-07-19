import { describe, expect, it } from 'vitest'
import type { CardDef, CardSet, GameState, Seat } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { validateCardSet } from '../src/validate.ts'
import { simulateGame } from '../src/simulate.ts'
import { assertConservation } from '../src/helpers.ts'
import { DEFAULT_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'

// ── #122 pick-from-hand foundation — the FOURTH mid-resolution pause (phase 'choose') ─────────────
// A new engine primitive: an onPlay op (chooseFromHand) enqueues card picks onto state.pendingChoices;
// applyAction parks in phase 'choose' AFTER runOps and drains them one resolveChoice at a time. Mirror
// the combat pause exactly — parked data, no continuation blob — so replays stay deterministic.

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) =>
  applyAction(s, a, seat).state

let n = 7000
/** Put a specific card in a seat's hand, return its instance id. */
function toHand(s: GameState, seat: Seat, slug: string): string {
  const id = `h${n++}`
  s.cardOf[id] = slug
  s.sides[seat].hand.push(id)
  return id
}
/** Give a seat `count` ready resources whose slug carries a purple pip (satisfies cost + pip gate). */
function fuel(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `r${n++}`
    s.cardOf[id] = 'glimpse' // pips [purple]
    s.sides[seat].resources.push({ id, exhausted: false })
  }
}
/** Seed `count` known cards onto the top of a seat's deck (last element = top, popped first). */
function seedDeck(s: GameState, seat: Seat, slugs: string[]): string[] {
  const ids: string[] = []
  for (const slug of slugs) {
    const id = `d${n++}`
    s.cardOf[id] = slug
    s.sides[seat].deck.push(id)
    ids.push(id)
  }
  return ids
}

/** A no-effects game at loop start with empty hands/decks the test fills itself.
 *  deckMinSize/maxCopies are relaxed only to admit the 1-card seed deck (they gate deck legality at
 *  createGame, nothing in play); everything else is stock DEFAULT_RULES (pips off → always castable). */
function fresh(seed = 3): { s: GameState; me: Seat; them: Seat } {
  let s = createGame({
    seed,
    rules: { ...DEFAULT_RULES, chooseStartingResources: false, deckMinSize: 1, maxCopies: 20 },
    cardSet: CARD_SET,
    players: [{ name: 'Ada', deck: ['glimpse'] }, { name: 'Bo', deck: ['glimpse'] }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  const me = s.actorSeat
  const them = (1 - me) as Seat
  // wipe the dealt hands/decks so the fixtures are exact
  s.sides[0].hand = []; s.sides[1].hand = []
  s.sides[0].deck = []; s.sides[1].deck = []
  return { s, me, them }
}

describe('#122 cards compile to the locked design', () => {
  it('Glimpse: cost 1, purple, draw-3 then discard-1 + deckBottom-1', () => {
    const g = CARD_SET['glimpse']
    expect(g.type).toBe('action')
    expect(g.cost).toBe(1)
    expect(g.pips).toEqual(['purple'])
    expect(g.onPlay).toEqual([
      { op: 'draw', n: 3 },
      { op: 'chooseFromHand', to: 'discard' },
      { op: 'chooseFromHand', to: 'deckBottom' },
    ])
  })

  it('Obscure: cost 3, two purple, draw-2 then symmetric discard (who:each) — no more preventBase', () => {
    const o = CARD_SET['obscure']
    expect(o.type).toBe('action')
    expect(o.cost).toBe(3)
    expect(o.pips).toEqual(['purple', 'purple'])
    expect(o.onPlay).toEqual([
      { op: 'draw', n: 2 },
      { op: 'chooseFromHand', who: 'each', to: 'discard' },
    ])
    expect((o.onPlay ?? []).some(op => op.op === 'preventBase')).toBe(false)
  })

  it('the whole card set still validates clean', () => {
    expect(validateCardSet(CARD_SET)).toEqual([])
  })
})

describe('#122 Glimpse — two sequential picks over the whole hand', () => {
  it('draw 3 → discard 1 → bottom 1: hand keeps the right cards, one lands on deck bottom', () => {
    const { s: g, me } = fresh()
    let s = g
    const glimpse = toHand(s, me, 'glimpse')
    // one card already held before the draw — proves the pick ranges over the WHOLE hand
    const held = toHand(s, me, 'duskweaver-oracle')
    // top of deck (popped in reverse): the 3 Glimpse draws
    const [dA, dB, dC] = seedDeck(s, me, ['dream-thief', 'cull-the-weak', 'midnight-reckoning'])
    fuel(s, me, 1)

    s = act(s, me, { type: 'play', card: glimpse })
    // parked in choose, NOT advanced past the caster
    expect(s.phase).toBe('choose')
    expect(s.actorSeat).toBe(me)
    expect(s.pendingChoices).toHaveLength(2)
    expect(s.pendingChoices[0]).toEqual({ seat: me, to: 'discard', srcLabel: 'Glimpse' })
    expect(s.pendingChoices[1].to).toBe('deckBottom')
    // Glimpse itself is already in the discard (the action resolved); the 4 hand cards remain
    expect(s.sides[me].discard).toContain(glimpse)
    expect([...s.sides[me].hand].sort()).toEqual([held, dA, dB, dC].sort())

    // legal actions = one resolveChoice per hand card
    const legal = getLegalActions(s, me)
    expect(legal.every(a => a.type === 'resolveChoice')).toBe(true)
    expect(legal).toHaveLength(4)

    // discard the pre-held card, bury one of the drawn cards
    s = act(s, me, { type: 'resolveChoice', card: held })
    expect(s.phase).toBe('choose')            // second pick still pending
    expect(s.actorSeat).toBe(me)
    expect(s.sides[me].discard).toContain(held)
    expect(s.sides[me].hand).not.toContain(held)

    s = act(s, me, { type: 'resolveChoice', card: dA })
    // queue drained → back to the loop, window advanced past the caster (opponent's turn)
    expect(s.phase).toBe('loop')
    expect(s.pendingChoices).toHaveLength(0)
    expect(s.chooseOpener).toBeNull()
    expect(s.actorSeat).not.toBe(me)
    // dA is on the BOTTOM of the deck (index 0), the two survivors stayed in hand
    expect(s.sides[me].deck[0]).toBe(dA)
    expect([...s.sides[me].hand].sort()).toEqual([dB, dC].sort())
    assertConservation(s)
  })

  it('exactly one eligible card → a single forced resolveChoice, and the bottom pick self-cancels', () => {
    const { s: g, me } = fresh()
    let s = g
    const glimpse = toHand(s, me, 'glimpse')
    fuel(s, me, 1)
    // deck holds exactly ONE card: draw-3 pulls it and whiffs twice (decision 33 fires for the DRAW,
    // not the discard). After the draw the hand is that single card, so the discard op queues one
    // entry and the deckBottom op finds an (about-to-be-)empty hand → queues nothing (silent no-op).
    const [only] = seedDeck(s, me, ['dream-thief'])
    s = act(s, me, { type: 'play', card: glimpse })
    expect(s.phase).toBe('choose')
    expect(s.pendingChoices).toHaveLength(1)        // discard queued; deckBottom self-cancelled
    expect(s.pendingChoices[0].to).toBe('discard')
    const legal = getLegalActions(s, me)
    expect(legal).toEqual([{ type: 'resolveChoice', card: only }])   // forced single pick
    s = act(s, me, { type: 'resolveChoice', card: only })
    expect(s.phase).toBe('loop')                    // drained, window advanced
    expect(s.sides[me].discard).toContain(only)
    assertConservation(s)
  })
})

describe('#122 Obscure — symmetric discard, both real pending entries', () => {
  it('caster discards first, then the opponent (actorSeat flips like combat)', () => {
    const { s: g, me, them } = fresh()
    let s = g
    const obscure = toHand(s, me, 'obscure')
    const mineHeld = toHand(s, me, 'duskweaver-oracle')
    const theirCard = toHand(s, them, 'cull-the-weak')
    seedDeck(s, me, ['dream-thief', 'midnight-reckoning'])   // Obscure draws 2
    fuel(s, me, 3)

    s = act(s, me, { type: 'play', card: obscure })
    expect(s.phase).toBe('choose')
    expect(s.pendingChoices).toHaveLength(2)
    expect(s.pendingChoices[0].seat).toBe(me)     // caster resolves first
    expect(s.pendingChoices[1].seat).toBe(them)   // opponent second
    expect(s.actorSeat).toBe(me)

    // caster discards their pre-held card
    s = act(s, me, { type: 'resolveChoice', card: mineHeld })
    expect(s.phase).toBe('choose')
    expect(s.actorSeat).toBe(them)                // flipped to the opponent — a real decision
    expect(getLegalActions(s, me)).toEqual([])    // not the caster's window anymore
    const oppLegal = getLegalActions(s, them)
    expect(oppLegal).toEqual([{ type: 'resolveChoice', card: theirCard }])

    s = act(s, them, { type: 'resolveChoice', card: theirCard })
    expect(s.phase).toBe('loop')
    expect(s.actorSeat).not.toBe(me)              // window advanced past the caster (opener)
    expect(s.sides[me].discard).toContain(mineHeld)
    expect(s.sides[them].discard).toContain(theirCard)
    assertConservation(s)
  })

  it('empty-handed opponent → silent no-op: only the caster is prompted, no penalty', () => {
    const { s: g, me, them } = fresh()
    let s = g
    const obscure = toHand(s, me, 'obscure')
    const mineHeld = toHand(s, me, 'duskweaver-oracle')
    // them: NO cards in hand
    seedDeck(s, me, ['dream-thief', 'midnight-reckoning'])
    fuel(s, me, 3)
    const lifeThemBefore = s.sides[them].life
    const infBefore = s.influence

    s = act(s, me, { type: 'play', card: obscure })
    expect(s.phase).toBe('choose')
    expect(s.pendingChoices).toHaveLength(1)      // only the caster's entry was queued
    expect(s.pendingChoices[0].seat).toBe(me)

    s = act(s, me, { type: 'resolveChoice', card: mineHeld })
    expect(s.phase).toBe('loop')
    // the empty discard cost the opponent nothing (a discard, not an empty draw)
    expect(s.sides[them].life).toBe(lifeThemBefore)
    expect(s.influence).toBe(infBefore)
    assertConservation(s)
  })
})

describe('#122 determinism + conservation under full simulation', () => {
  // A tiny card set whose plays exercise Glimpse AND Obscure alongside vanilla bodies, run headless
  // under the intercept ruleset (pips off, so both cards are always castable). simulateGame asserts
  // conservation every step and reproduces bit-for-bit on the same seed.
  const V: CardSet = {
    ...Object.fromEntries((['glimpse', 'obscure'] as const).map(slug => [slug, CARD_SET[slug]])),
    grunt: { slug: 'grunt', name: 'grunt', color: 'red', type: 'unit', cost: 2, power: 2, health: 2, text: '' } satisfies CardDef,
    ram: { slug: 'ram', name: 'ram', color: 'red', type: 'unit', cost: 3, power: 3, health: 3, text: '' } satisfies CardDef,
  }
  // relax only the deck-legality knobs (48-min / 4-copy) so a compact 4-slug deck is legal — pips are
  // off under DEFAULT_RULES, so Glimpse and Obscure are always castable and get exercised every game.
  const RULES = { ...DEFAULT_RULES, deckMinSize: 8, maxCopies: 20 }
  const deck = () => Object.keys(V).flatMap(slug => [slug, slug, slug, slug, slug])

  it('20 seeded games playing Glimpse + Obscure terminate with a winner, both seat orders', { timeout: 60_000 }, () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = simulateGame(seed, deck(), deck(), { rules: RULES, cardSet: V, policyA: 'heuristic', policyB: 'heuristic' })
      expect(r.winner === 0 || r.winner === 1).toBe(true)
    }
  })

  it('same seed → identical game (the choose pause preserves replay determinism)', () => {
    const x = simulateGame(42, deck(), deck(), { rules: RULES, cardSet: V, policyA: 'heuristic', policyB: 'random' })
    const y = simulateGame(42, deck(), deck(), { rules: RULES, cardSet: V, policyA: 'heuristic', policyB: 'random' })
    expect(x).toEqual(y)
  })
})
