import type { GameAction, GameState, Seat, UnitInstance } from './types.ts'
import { homeZone } from './types.ts'
import { defOf, effArmor, effHealth, effPower, hasKw, influenceFor, kwOf, other, unitsInZone } from './helpers.ts'
import { getLegalActions } from './legal.ts'
import { rngNext } from './rng.ts'

/**
 * Baseline AI: greedy one-ply scoring over the legal-action list.
 * Deliberately simple — it exists so the designer can playtest alone and so
 * simulations have a policy smarter than random. Deterministic: seeded jitter
 * breaks ties (and prevents two greedy bots from mirror-locking forever).
 */
export type PolicyName = 'random' | 'heuristic'
export type Policy = (state: GameState, seat: Seat, rngState: number) => [GameAction, number]

export function randomPolicy(state: GameState, seat: Seat, rngState: number): [GameAction, number] {
  const legal = getLegalActions(state, seat)
  const nonPass = legal.filter(a => a.type !== 'pass' && a.type !== 'skipResource')
  let [roll, s] = rngNext(rngState)
  const pool = nonPass.length && roll >= 0.15 ? nonPass : legal
  let v: number
  ;[v, s] = rngNext(s)
  return [pool[Math.floor(v * pool.length)], s]
}

function attackScore(state: GameState, attackerId: string, target: GameAction & { type: 'attack' }): number {
  const attacker = state.units[attackerId]
  if (!attacker) return 0
  let power = effPower(state, attacker)
  const oe = kwOf(state, attacker, 'overextend')
  if (typeof oe === 'number' && unitsInZone(state, attacker.zone, attacker.owner).length === 1) power += oe

  if (target.target.kind === 'base') return 90 + power * 4 // pressure the win condition

  if (target.target.kind !== 'unit') return 0
  const defender = state.units[target.target.id]
  if (!defender) return 0
  const dealt = Math.max(0, power - effArmor(state, defender))
  const defRemaining = effHealth(state, defender) - defender.damage
  const counter = defender.imprisoned ? 0 : Math.max(0, effPower(state, defender) - effArmor(state, attacker))
  const atkRemaining = effHealth(state, attacker) - attacker.damage
  const kills = dealt >= defRemaining
  const dies = counter >= atkRemaining
  const defValue = defOf(state, defender.id).cost + effPower(state, defender)
  const atkValue = defOf(state, attacker.id).cost + power

  if (kills && !dies) return 70 + defValue * 3
  if (kills && dies) return 40 + (defValue - atkValue) * 3
  if (dealt > 0 && !dies) return 15 + dealt
  return dealt > 0 ? 4 : 0
}

function playScore(state: GameState, seat: Seat, action: GameAction & { type: 'play' }): number {
  const def = defOf(state, action.card)
  if (def.type === 'unit') return 45 + def.cost * 3 // develop the board, biggest first
  // actions/upgrades: modest default, influence-aware
  let score = 28 + def.cost
  const infOps = [...(def.onPlay ?? [])].filter(op => op.op === 'influence')
  for (const op of infOps) {
    if (op.op !== 'influence') continue
    score += op.n > 0 ? op.n * 4 : op.n * 2 // gaining influence is good; ceding it (red overextend) costs
  }
  // don't dump removal on nothing: targeted plays already require legal targets
  return score
}

function moveScore(state: GameState, seat: Seat, action: GameAction & { type: 'move' }): number {
  const unit = state.units[action.unit]
  if (!unit) return 0
  const enemyHome = homeZone(other(seat))
  const toward = Math.abs(action.to - enemyHome) < Math.abs(unit.zone - enemyHome)
  const power = effPower(state, unit)
  if (hasKw(state, unit, 'cantAttack')) return toward ? 2 : 1 // walls mostly hold home
  const enemiesAtDest = unitsInZone(state, action.to, other(seat)).length
  let score = toward ? 18 + power : 3
  if (action.to === enemyHome && enemiesAtDest === 0) score += 10 // open lane to the base
  return score
}

export function heuristicPolicy(state: GameState, seat: Seat, rngState: number): [GameAction, number] {
  const legal = getLegalActions(state, seat)
  let s = rngState
  let best: GameAction = legal[0]
  let bestScore = -Infinity

  const handSize = state.sides[seat].hand.length
  for (const action of legal) {
    let score = 0
    switch (action.type) {
      case 'attack': score = attackScore(state, action.attacker, action); break
      case 'play': score = playScore(state, seat, action); break
      case 'move': score = moveScore(state, seat, action); break
      case 'resource': {
        const ready = state.sides[seat].resources.filter(r => !r.exhausted).length
        // bank early and when flooded; slow down once the economy is online
        score = ready < 4 ? 55 : handSize >= 5 ? 40 : 12
        score -= defOf(state, action.card).cost // prefer banking cheap spares, keep the threats
        break
      }
      case 'skipResource': score = 8; break
      case 'pass': score = 1; break
      case 'concede': score = -Infinity; break
    }
    let jitter: number
    ;[jitter, s] = rngNext(s)
    score += jitter // deterministic tiebreak + loop-breaker
    if (score > bestScore) { bestScore = score; best = action }
  }
  // safety: influence check — never play a big-overextend action if it would lose the game outright
  if (best.type === 'play') {
    const def = defOf(state, best.card)
    const cede = (def.onPlay ?? []).reduce((n, op) => (op.op === 'influence' && op.n < 0 ? n + op.n : n), 0)
    if (cede < 0 && influenceFor(state, seat) + cede <= -state.rules.influenceWinThreshold + 1) {
      return [{ type: 'pass' }, s]
    }
  }
  return [best, s]
}

export const POLICIES: Record<PolicyName, Policy> = {
  random: randomPolicy,
  heuristic: heuristicPolicy,
}

/** One shared derivation for the policy rng stream — the simulator and any visual
 *  replayer must use this same function so a seed reproduces the identical game. */
export const policyRngInit = (seed: number): number => (seed ^ 0x9e3779b9) | 0
