import { describe, it, expect } from 'vitest'
import type { CardSet, GameState, Op, Seat } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { runOps } from '../src/effects.ts'
import { influenceFor } from '../src/helpers.ts'
import { validateCardSet } from '../src/validate.ts'
import { DEFAULT_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { T, toyDeck, put } from './util.ts'

// ── #122 (Midnight Reckoning) — the `reckoning` op, a self-contained AoE finisher ────────────────
// One atomic op (Griff: "everything resolves inside the card's effects"): 7 to EVERY unit, +1
// Influence per unit it fells (friend AND foe — decision 74), and if fewer than 7 fell the
// opponent's base takes 7 through the standard ward-respecting damageBase. Because each kill is
// worth exactly +1, "gained less than 7 Influence" IS "fewer than 7 died" — a count the op holds
// inline, so it never touches Cond and needs no influence-introspection primitive.

// Toy set: a chump that dies to the sweep, and a titan that survives 7 (so its damage is readable).
const R: CardSet = {
  ...T,
  grunt: { slug: 'grunt', name: 'grunt', color: 'purple', type: 'unit', cost: 2, power: 2, health: 2, text: '' },
  titan: { slug: 'titan', name: 'titan', color: 'purple', type: 'unit', cost: 5, power: 0, health: 12, text: '' },
}

function reckGame(seed = 5): GameState {
  return createGame({
    seed,
    rules: { ...DEFAULT_RULES, chooseStartingResources: false },
    cardSet: R,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
}

const RECKON: Op = { op: 'reckoning', n: 7, influencePerKill: 1, killThreshold: 7, shortfallLife: 7 }
const reckon = (s: GameState, me: Seat) => runOps({ state: s, controller: me, actorSeat: me }, [RECKON])

describe('reckoning op (#122 Midnight Reckoning)', () => {
  it('deals n damage to EVERY unit — both sides, the caster\'s own included', () => {
    const s = reckGame()
    const mine = put(s, 0, 'titan', 0)     // 0/12 mine — survives 7, so its damage stays readable
    const theirs = put(s, 1, 'titan', 2)   // 0/12 theirs
    reckon(s, 0)
    expect(s.units[mine].damage).toBe(7)   // the caster's OWN unit ate the sweep ("all units," literal)
    expect(s.units[theirs].damage).toBe(7)
  })

  it('the controller gains influencePerKill for each unit the sweep fells (both sides)', () => {
    const s = reckGame()
    put(s, 0, 'grunt', 0)   // mine → dies
    put(s, 1, 'grunt', 2)   // theirs → dies
    put(s, 1, 'grunt', 1)   // theirs → dies
    put(s, 0, 'titan', 0)   // mine → survives, NOT a kill
    const before = influenceFor(s, 0)
    reckon(s, 0)
    expect(influenceFor(s, 0) - before).toBe(3)   // exactly the 3 felled → +3, no more
  })

  it('own-unit deaths count toward the Influence (decision 74: a kill is a kill)', () => {
    const s = reckGame()
    put(s, 0, 'grunt', 0)   // both belong to the caster
    put(s, 0, 'grunt', 1)
    const before = influenceFor(s, 0)
    reckon(s, 0)
    expect(influenceFor(s, 0) - before).toBe(2)   // the caster's own two bodies paid out
    expect(s.units).toEqual({})                    // and both are gone
  })

  it('fewer than killThreshold fall → the opponent\'s base loses shortfallLife', () => {
    const s = reckGame()
    put(s, 1, 'grunt', 2)   // one dies — well short of 7
    const beforeLife = s.sides[1].life
    reckon(s, 0)
    expect(s.sides[1].life).toBe(beforeLife - 7)
  })

  it('the shortfall is a ward-respecting burn — preventBase reduces it, no piercing', () => {
    const s = reckGame()
    put(s, 1, 'grunt', 2)      // one dies → the shortfall fires
    s.preventBase[1] = 3       // opponent has 3 base-damage prevention standing
    const beforeLife = s.sides[1].life
    reckon(s, 0)
    expect(s.sides[1].life).toBe(beforeLife - 4)   // 7 − 3 prevented = 4 lands (the standard spell-to-face path)
    expect(s.preventBase[1]).toBe(0)               // the ward was spent, not pierced
  })

  it('when at least killThreshold units fall, the opponent\'s base is spared', () => {
    const s = reckGame()
    for (let i = 0; i < 4; i++) put(s, 0, 'grunt', 0)   // 4 of mine
    for (let i = 0; i < 3; i++) put(s, 1, 'grunt', 2)   // 3 of theirs → 7 fall in all
    const beforeInf = influenceFor(s, 0)
    const beforeLife = s.sides[1].life
    reckon(s, 0)
    expect(influenceFor(s, 0) - beforeInf).toBe(7)   // 7 kills → +7 Influence
    expect(s.sides[1].life).toBe(beforeLife)         // 7 ≥ threshold → no face damage
  })

  it('the real Midnight Reckoning compiles and wires the reckoning op', () => {
    expect(validateCardSet(CARD_SET)).toEqual([])
    expect(CARD_SET['midnight-reckoning']).toMatchObject({
      type: 'action', cost: 7, pips: ['purple', 'purple', 'purple'],
      onPlay: [{ op: 'reckoning', n: 7, influencePerKill: 1, killThreshold: 7, shortfallLife: 7 }],
    })
  })
})
