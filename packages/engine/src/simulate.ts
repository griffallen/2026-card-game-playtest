import type { CardSet, GameState, RulesConfig, SimResult } from './types.ts'
import { EngineError } from './types.ts'
import { assertConservation } from './helpers.ts'
import { createGame } from './setup.ts'
import { applyAction } from './engine.ts'
import { getLegalActions } from './legal.ts'
import { DEFAULT_RULES } from './rules.ts'
import { CARD_SET } from './cards/index.ts'
import { POLICIES, policyRngInit, type PolicyName } from './ai.ts'

const MAX_ACTIONS = 4000

export interface SimOpts {
  rules?: RulesConfig
  cardSet?: CardSet
  policyA?: PolicyName
  policyB?: PolicyName
}

/**
 * Headless playout with a pluggable policy per seat (simulation spec).
 * Deterministic: policy rng derives from the game seed — one seed reproduces
 * the entire game, bugs included.
 */
export function simulateGame(seed: number, deckA: string[], deckB: string[], opts: SimOpts = {}): SimResult {
  const rules = opts.rules ?? DEFAULT_RULES
  const cardSet = opts.cardSet ?? CARD_SET
  const policies = [POLICIES[opts.policyA ?? 'random'], POLICIES[opts.policyB ?? 'random']] as const

  let state: GameState = createGame({
    seed, rules, cardSet,
    players: [{ name: 'SimA', deck: deckA }, { name: 'SimB', deck: deckB }],
  })
  let policyRng = policyRngInit(seed)
  let actions = 0
  let minInfluence = 0
  let maxInfluence = 0

  while (state.winner === null) {
    if (++actions > MAX_ACTIONS) {
      throw new EngineError('livelock', `seed ${seed}: no winner after ${MAX_ACTIONS} actions (turn ${state.turn})`)
    }
    if (!getLegalActions(state, state.actorSeat).length) {
      throw new EngineError('stuck', `seed ${seed}: no legal actions and no winner`)
    }
    let choice
    ;[choice, policyRng] = policies[state.actorSeat](state, state.actorSeat, policyRng)
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
    minInfluence: minInfluence === 0 ? 0 : minInfluence,
    maxInfluence: maxInfluence === 0 ? 0 : maxInfluence,
  }
}

/** Back-compat alias used by the v0 harness tests. */
export function simulateRandomGame(
  seed: number,
  deckA: string[],
  deckB: string[],
  rules: RulesConfig = DEFAULT_RULES,
  cardSet: CardSet = CARD_SET,
): SimResult {
  return simulateGame(seed, deckA, deckB, { rules, cardSet })
}
