import { describe, expect, it } from 'vitest'
import type { GameState, Seat } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { V3_RULES } from '../src/rules.ts'
import { addInfluence, checkWin, influenceFor } from '../src/helpers.ts'
import { T, toyDeck } from './util.ts'

function game(): GameState {
  return createGame({
    seed: 701,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: T,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
}

describe('independent Hope tracks', () => {
  it('starts both players at 24 Life and 0 Hope', () => {
    const state = game()
    expect(state.sides.map(s => s.life)).toEqual([24, 24])
    expect(state.hope).toEqual([0, 0])
  })

  it('changes only the effect owner’s Hope by default', () => {
    const state = game()
    addInfluence(state, 0, 3)
    addInfluence(state, 1, 2)
    expect(state.hope).toEqual([3, 2])
    expect(influenceFor(state, 0)).toBe(3)
    expect(influenceFor(state, 1)).toBe(2)
  })

  it('allows values past the Hope band, then awards the owner the game', () => {
    const state = game()
    state.hope[0] = 14
    checkWin(state, 0)
    expect(state.winner).toBe(0)
    expect(state.winReason).toBe('hope')
  })

  it('awards the opponent the game when a player reaches −12 Hope', () => {
    const state = game()
    state.hope[1] = -12
    checkWin(state, 0)
    expect(state.winner).toBe(0)
    expect(state.winReason).toBe('hope')
  })

  it('uses the player taking the action to break a simultaneous win', () => {
    const state = game()
    state.hope = [12, 12]
    checkWin(state, 1 as Seat)
    expect(state.winner).toBe(1)
    expect(state.winReason).toBe('hope')
  })
})
