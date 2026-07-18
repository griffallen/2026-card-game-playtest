// @newgame/ai — the eval policy (issue #97). A greedy 1-ply bot that ranks its legal moves by the
// learned win-probability of the state each move produces, and plays the best one.
//
// Node-free (the demo will run this in the browser): the only imports are the engine's own
// browser-safe surface — legal-move enumeration, the reducer, and the heuristic bot that serves as
// the sacred fallback. `applyAction` already clones its input (structuredClone), so simulating a
// candidate never mutates the real state; there is no separate copy step to get wrong.
import {
  applyAction, getLegalActions, heuristicPolicy,
  type GameAction, type GameState, type Seat,
} from '@newgame/engine'
import { scoreState, type LinearModel } from './infer.ts'

/**
 * Pick `seat`'s move by 1-ply lookahead: for each legal action, simulate it on a fresh copy, score
 * the resulting state with the model (= P(seat wins)), and keep the highest. Deterministic — the
 * FIRST legal action to reach the running maximum wins ties (a stable, rng-free tie-break).
 *
 * The eval bot is never allowed to get stuck or return an illegal move — the SACRED FALLBACK:
 *   1. best finite-scored candidate (the normal path),
 *   2. else the heuristic bot's pick (always legal),
 *   3. else the first legal action.
 * A degenerate candidate (a simulate that throws, or a non-finite score) is skipped, never chosen.
 *
 * `rngState` is only consumed if the heuristic fallback fires (it needs the shared policy rng);
 * the greedy path itself is deterministic and ignores it.
 */
export function evalMove(state: GameState, seat: Seat, model: LinearModel, rngState = 0): GameAction {
  const legal = getLegalActions(state, seat)
  if (legal.length === 0) {
    throw new Error(`evalMove: no legal actions for seat ${seat} (game over or not this seat's window)`)
  }

  let best: GameAction | null = null
  let bestScore = -Infinity
  for (const action of legal) {
    let next: GameState
    try {
      next = applyAction(state, action, seat).state
    } catch {
      continue // getLegalActions mirrors applyAction, so this is purely defensive
    }
    const s = scoreState(next, seat, model) // throws on a version mismatch — a bad model must fail loudly
    if (Number.isFinite(s) && s > bestScore) {
      bestScore = s
      best = action
    }
  }

  if (best !== null) return best

  // Nothing scored (every candidate degenerate): fall back to the incumbent, then to first-legal.
  try {
    const fallback = heuristicPolicy(state, seat, rngState)[0]
    if (fallback) return fallback
  } catch {
    /* fall through */
  }
  return legal[0]
}

/** The engine `Policy` shape: `(state, seat, rngState) => [action, nextRng]`. The greedy policy
 *  consumes no randomness, so it threads `rngState` back unchanged (only the heuristic fallback,
 *  reached inside evalMove, would use it). Lets the scoreboard drop the eval bot straight into the
 *  same play loop the simulator uses for the heuristic bot. */
export type EnginePolicy = (state: GameState, seat: Seat, rngState: number) => [GameAction, number]

export function evalPolicy(model: LinearModel): EnginePolicy {
  return (state, seat, rngState) => [evalMove(state, seat, model, rngState), rngState]
}
