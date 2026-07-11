import { describe, it, expect } from 'vitest'
import type { CardSet, GameState, Seat } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { DEFAULT_RULES, V3_RULES } from '../src/rules.ts'
import { T, toyDeck } from './util.ts'

// Slice V3-2 — decision 69: pips are a PRESENCE gate, never a payment.
// Cost exhausts any resources; pips require banked color sources (1 per color per card).
const P: CardSet = {
  ...T,
  redpip:  { slug: 'redpip', name: 'redpip', color: 'red', type: 'action', cost: 1, text: '', pips: ['red'], onPlay: [] },
  freebie: { slug: 'freebie', name: 'freebie', color: 'red', type: 'action', cost: 0, text: '', pips: ['red'], onPlay: [] },
  heavy:   { slug: 'heavy', name: 'heavy', color: 'red', type: 'unit', cost: 3, power: 5, health: 5, text: '', pips: ['red', 'red', 'red'] },
  duo:     { slug: 'duo', name: 'duo', color: 'purple', type: 'unit', cost: 2, power: 2, health: 2, text: '', pips: ['red', 'purple'] },
}

function v3game(): GameState {
  return createGame({
    seed: 9,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: P,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
}
function toLoop(state: GameState): GameState {
  let s = state
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}
let n = 9000
/** Force a card into hand and/or bank (tests own the setup, like put()). */
function toHand(s: GameState, seat: Seat, slug: string): string {
  const id = `p${n++}`
  s.cardOf[id] = slug
  s.sides[seat].hand.push(id)
  return id
}
function bank(s: GameState, seat: Seat, slug: string): string {
  const id = `p${n++}`
  s.cardOf[id] = slug
  s.sides[seat].resources.push({ id, exhausted: false })
  return id
}

describe('pips — presence model (decision 69)', () => {
  it('gates a play on banked color sources and exhausts only generic cost', () => {
    let s = toLoop(v3game())
    const me = s.actorSeat
    const card = toHand(s, me, 'redpip')
    bank(s, me, 'pawn')                 // pip-less: provides no color
    expect(() => applyAction(s, { type: 'play', card }, me))
      .toThrowError(/pip/i)             // 1 red pip, zero red sources
    bank(s, me, 'redpip')               // its own pips make it a red source
    const before = s.sides[me].resources.filter(r => !r.exhausted).length
    s = applyAction(s, { type: 'play', card }, me).state
    const after = s.sides[me].resources.filter(r => !r.exhausted).length
    expect(before - after).toBe(1)      // cost 1 exhausted; the pip exhausted NOTHING extra
  })

  it('0-cost cards still face the pip gate (the PR-#14 escape is closed)', () => {
    const s = toLoop(v3game())
    const me = s.actorSeat
    const card = toHand(s, me, 'freebie')
    expect(() => applyAction(s, { type: 'play', card }, me)).toThrowError(/pip/i)
    bank(s, me, 'redpip')
    expect(() => applyAction(s, { type: 'play', card }, me)).not.toThrow()
  })

  it('same-color pips never stack on the providing side; multi-color cards provide each color', () => {
    const s = toLoop(v3game())
    const me = s.actorSeat
    const card = toHand(s, me, 'heavy')          // needs 3 distinct red sources
    bank(s, me, 'heavy')                          // RRR banked = still just 1 red source
    bank(s, me, 'heavy')
    bank(s, me, 'pawn'); bank(s, me, 'pawn')      // cost fodder, no color
    expect(() => applyAction(s, { type: 'play', card }, me)).toThrowError(/pip/i)
    bank(s, me, 'duo')                            // red+purple: provides red (and purple)
    expect(() => applyAction(s, { type: 'play', card }, me)).not.toThrow()
  })

  it('getLegalActions respects the gate', () => {
    const s = toLoop(v3game())
    const me = s.actorSeat
    toHand(s, me, 'freebie')
    expect(getLegalActions(s, me).some(a => a.type === 'play' && s.cardOf[a.card] === 'freebie')).toBe(false)
    bank(s, me, 'redpip')
    expect(getLegalActions(s, me).some(a => a.type === 'play' && s.cardOf[a.card] === 'freebie')).toBe(true)
  })

  it('v2.3 rules ignore pips entirely', () => {
    const s = toLoop(createGame({
      seed: 9,
      rules: { ...DEFAULT_RULES, chooseStartingResources: false },
      cardSet: P,
      players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
    }))
    const me = s.actorSeat
    const card = toHand(s, me, 'redpip')
    bank(s, me, 'pawn')                           // no red source anywhere
    expect(() => applyAction(s, { type: 'play', card }, me)).not.toThrow()
  })
})

// card-file plumbing: the designer-owned `pips:` line round-trips (Q3 / decision 66)
import { parseCardFile, serializeCardFile } from '../src/cards/cardfile.ts'
describe('pips — card file field', () => {
  const file = `---
name: Test Burn
type: action
cost: 2
pips: red, red
status: draft
effects: {"onPlay":[]}
---
Deal fire.
`
  it('parses and round-trips pips', () => {
    const r = parseCardFile(file, 'test-burn', 'red')
    expect(r.errors).toEqual([])
    expect(r.card!.def.pips).toEqual(['red', 'red'])
    expect(serializeCardFile(r.card!.def, 'draft')).toContain('pips: red, red')
  })
  it('rejects unknown pip colors', () => {
    const bad = file.replace('red, red', 'red, chartreuse')
    expect(parseCardFile(bad, 'test-burn', 'red').errors.join(' ')).toMatch(/chartreuse/)
  })
})
