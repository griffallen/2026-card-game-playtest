import type { CardSet, GameAction, GameState, RulesConfig, SimResult } from './types.ts'
import { EngineError } from './types.ts'
import { rngInt } from './rng.ts'
import { assertConservation, influenceFor } from './helpers.ts'
import { createGame } from './setup.ts'
import { applyAction } from './engine.ts'
import { getLegalActions } from './legal.ts'
import { DEFAULT_RULES } from './rules.ts'
import { CARD_SET } from './cards/index.ts'

const MAX_ACTIONS = 4000

/**
 * Headless random-policy playout (simulation spec v0). Deterministic: the policy rng derives
 * from the game seed, so one seed reproduces the entire game, bugs included.
 * The policy passes only 15% of the time when other actions exist — pure-uniform players
 * mutually pass forever once decks run dry.
 */
export function simulateRandomGame(
  seed: number,
  deckA: string[],
  deckB: string[],
  rules: RulesConfig = DEFAULT_RULES,
  cardSet: CardSet = CARD_SET,
): SimResult {
  let state: GameState = createGame({
    seed, rules, cardSet,
    players: [{ name: 'SimA', deck: deckA }, { name: 'SimB', deck: deckB }],
  })
  let policyRng = (seed ^ 0x9e3779b9) | 0
  let actions = 0
  let minInfluence = 0
  let maxInfluence = 0

  while (state.winner === null) {
    if (++actions > MAX_ACTIONS) {
      throw new EngineError('livelock', `seed ${seed}: no winner after ${MAX_ACTIONS} actions (turn ${state.turn})`)
    }
    const legal = getLegalActions(state, state.actorSeat)
    if (!legal.length) throw new EngineError('stuck', `seed ${seed}: no legal actions and no winner`)

    const nonPass = legal.filter(a => a.type !== 'pass' && a.type !== 'skipResource')
    let choice: GameAction
    let roll: number
    ;[roll, policyRng] = rngInt(policyRng, 100)
    if (nonPass.length && roll >= 15) {
      let i: number
      ;[i, policyRng] = rngInt(policyRng, nonPass.length)
      choice = nonPass[i]
    } else {
      let i: number
      ;[i, policyRng] = rngInt(policyRng, legal.length)
      choice = legal[i]
    }

    state = applyAction(state, choice, state.actorSeat).state
    assertConservation(state)
    minInfluence = Math.min(minInfluence, state.influence)
    maxInfluence = Math.max(maxInfluence, state.influence)
  }

  return {
    winner: state.winner,
    winReason: state.winReason ?? 'unknown',
    turns: state.turn,
    actions,
    minInfluence: influenceForRaw(minInfluence),
    maxInfluence: influenceForRaw(maxInfluence),
  }
}

const influenceForRaw = (v: number) => (v === 0 ? 0 : v)
