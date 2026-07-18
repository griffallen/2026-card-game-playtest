import { describe, expect, it } from 'vitest'
import {
  CARD_SET, V3_RULES, applyAction, createGame, getLegalActions,
  PREBUILT_DECKS, deckSlugs, type GameAction, type GameState, type Seat,
} from '@newgame/engine'
import { FEATURE_NAMES, FEATURE_VERSION } from '../src/index.ts'
import { evalMove, evalPolicy } from '../src/policy.ts'
import type { LinearModel } from '../src/infer.ts'
import { blankGame } from './helpers.ts'

function zeroModel(): LinearModel {
  return { featureVersion: FEATURE_VERSION, weights: new Array(FEATURE_NAMES.length).fill(0), bias: 0 }
}

const same = (a: GameAction, b: GameAction) => JSON.stringify(a) === JSON.stringify(b)
const isLegal = (state: GameState, seat: Seat, a: GameAction) =>
  getLegalActions(state, seat).some(x => same(x, a))
const deck = (slug: string) => deckSlugs(PREBUILT_DECKS.find(d => d.slug === slug)!)

/** Build a degenerate loop-phase state whose ONLY legal action is 'pass'. */
function passOnlyState(): GameState {
  const state = blankGame()
  state.sides[0].hand = []
  state.sides[0].resources = []
  state.units = {}
  state.upgrades = {}
  state.phase = 'loop'
  state.actorSeat = 0
  state.claimedThisRound = true
  state.winner = null
  return state
}

describe('evalMove', () => {
  it('returns a legal, deterministic move at every decision across a driven game', () => {
    const model = zeroModel()
    let state = createGame({
      seed: 42, rules: V3_RULES, cardSet: CARD_SET,
      players: [{ name: 'A', deck: deck('crimson-assault') }, { name: 'B', deck: deck('radiant-order') }],
    })
    let steps = 0
    while (state.winner === null && steps < 150) {
      const seat = state.actorSeat
      if (!getLegalActions(state, seat).length) break
      const chosen = evalMove(state, seat, model)
      expect(isLegal(state, seat, chosen)).toBe(true)
      expect(same(chosen, evalMove(state, seat, model))).toBe(true) // pure: same state -> same move
      state = applyAction(state, chosen, seat).state
      steps++
    }
    expect(steps).toBeGreaterThan(3)
  })

  it('returns the only legal move on a degenerate near-empty state', () => {
    const state = passOnlyState()
    const legal = getLegalActions(state, 0)
    expect(legal.length).toBe(1)
    const chosen = evalMove(state, 0, zeroModel())
    expect(same(chosen, legal[0])).toBe(true)
  })

  it('throws a clear error on a featureVersion mismatch (a stale model is refused)', () => {
    const state = passOnlyState()
    const bad = { ...zeroModel(), featureVersion: FEATURE_VERSION + 1 }
    expect(() => evalMove(state, 0, bad)).toThrow(/featureVersion/i)
  })
})

describe('evalPolicy', () => {
  it('adapts evalMove to the engine Policy signature, threading rng unchanged', () => {
    const state = passOnlyState()
    const [action, rngOut] = evalPolicy(zeroModel())(state, 0, 12345)
    expect(isLegal(state, 0, action)).toBe(true)
    expect(rngOut).toBe(12345) // greedy 1-ply consumes no randomness
  })
})
