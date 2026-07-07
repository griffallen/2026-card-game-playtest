import type { GameState, Seat } from './types.ts'
import { addInfluence, condHolds, defOf, draw, log, other, unitsOf } from './helpers.ts'
import { runOps, stateBasedCleanup } from './effects.ts'

/**
 * Reset + Draw for the current active seat; leaves the state at the Resource phase.
 * Assumes state.turn / state.activeSeat are already set (by setup or endTurn).
 */
export function startTurn(state: GameState) {
  const seat = state.activeSeat
  log(state, seat, `— Turn ${state.turn}: ${state.sides[seat].name} —`)

  // Reset: start-of-turn triggers (active seat's units + their upgrades, id order)
  for (const u of unitsOf(state, seat)) {
    if (state.winner !== null) return
    if (u.imprisoned) continue
    const own = defOf(state, u.id).startOfTurn
    if (own && condHolds(state, seat, own.cond)) {
      runOps({ state, controller: seat, sourceUnit: u.id, actorSeat: seat }, own.ops)
    }
    for (const upId of u.upgrades) {
      const up = defOf(state, upId).startOfTurn
      if (up && condHolds(state, seat, up.cond)) {
        runOps({ state, controller: seat, sourceUnit: u.id, actorSeat: seat }, up.ops)
      }
    }
  }

  // Prison decay: −1 influence per unit this seat holds imprisoned (v1.2)
  const held = unitsOf(state).filter(u => u.imprisoned?.by === seat).length
  if (held > 0 && state.rules.prisonDecayPerUnit > 0) {
    addInfluence(state, seat, -held * state.rules.prisonDecayPerUnit)
    log(state, seat, `${state.sides[seat].name} pays ${held * state.rules.prisonDecayPerUnit} influence to hold ${held} prisoner${held > 1 ? 's' : ''}`)
    stateBasedCleanup(state, seat)
  }
  if (state.winner !== null) return

  // Ready
  for (const u of unitsOf(state, seat)) u.exhausted = false
  for (const r of state.sides[seat].resources) r.exhausted = false

  // Draw
  const n = state.turn === 1 ? state.rules.firstTurnDraw : state.rules.drawPerTurn
  draw(state, seat, n)
  log(state, seat, `${state.sides[seat].name} draws ${n} card${n === 1 ? '' : 's'}`)

  state.phase = 'resource'
  state.actorSeat = seat
  state.passStreak = 0
  state.resourcedThisTurn = 0
}

/** End phase: expire this-turn effects, then hand the turn over (or grant a pending extra turn). */
export function endTurn(state: GameState, actorSeat: Seat) {
  for (const u of unitsOf(state)) u.mods = u.mods.filter(m => !m.turn)
  state.preventBase = [0, 0]
  stateBasedCleanup(state, actorSeat)
  if (state.winner !== null) return

  const next: Seat = state.pendingExtraTurn ?? other(state.activeSeat)
  if (state.pendingExtraTurn !== null) log(state, next, `${state.sides[next].name} seizes an extra turn`)
  state.pendingExtraTurn = null
  state.activeSeat = next
  state.turn += 1
  startTurn(state)
}
