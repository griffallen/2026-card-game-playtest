import type { GameAction, GameState, Seat, UnitInstance } from './types.ts'
import { homeZone } from './types.ts'
import { defOf, effArmor, effHealth, effPower, hasKw, idNum, influenceFor, kwOf, other, unitsInZone } from './helpers.ts'
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

/** Score a (possibly multi-unit) attack: combined power vs the target, counter on the highest-power member. */
function attackScore(state: GameState, action: GameAction & { type: 'attack' }): number {
  const units = action.attackers.map(id => state.units[id]).filter(Boolean) as UnitInstance[]
  if (!units.length) return 0
  const n = units.length
  const oeIds = action.overextend ?? []
  const pw = (u: UnitInstance) => {
    let p = effPower(state, u)
    const oe = kwOf(state, u, 'overextend')
    if (oeIds.includes(u.id) && typeof oe === 'number') p += oe
    return p
  }
  const combined = units.reduce((sum, u) => sum + pw(u), 0)
  const oeTotal = oeIds.reduce((sum, id) => {
    const v = kwOf(state, state.units[id], 'overextend')
    return sum + (typeof v === 'number' ? v : 0)
  }, 0)
  const groupKill = 2 * (n - 1)   // focus-fire that converts a kill is good
  const groupMiss = -3 * (n - 1)  // over-committing into a wall is bad

  if (action.target.kind === 'base') {
    let s = 90 + combined * 4 + groupKill
    if (oeTotal) s -= oeTotal
    return s
  }
  if (action.target.kind !== 'unit') return 0
  const defender = state.units[action.target.id]
  if (!defender) return 0
  const dealt = Math.max(0, combined - effArmor(state, defender))
  const dealtPlain = Math.max(0, combined - oeTotal - effArmor(state, defender))
  const defRemaining = effHealth(state, defender) - defender.damage
  const kills = dealt >= defRemaining
  // counter lands on the highest-power attacker (ties → lowest id) — mirror the engine
  const counterTarget = units.slice().sort((x, y) => pw(y) - pw(x) || idNum(x.id) - idNum(y.id))[0]
  const ctRemaining = effHealth(state, counterTarget) - counterTarget.damage
  const ctOE = oeIds.includes(counterTarget.id) && typeof kwOf(state, counterTarget, 'overextend') === 'number'
    ? kwOf(state, counterTarget, 'overextend') as number : 0
  const counter = defender.imprisoned ? 0 : Math.max(0, effPower(state, defender) - effArmor(state, counterTarget))
  const dies = counter >= ctRemaining || (ctOE > 0 && counter + ctOE >= ctRemaining)
  const defValue = defOf(state, defender.id).cost + effPower(state, defender)
  const atkValue = defOf(state, counterTarget.id).cost + effPower(state, counterTarget)

  // only gamble when the Overextend bonus is what converts the kill
  if (oeTotal > 0 && dealtPlain >= defRemaining) return 2

  if (kills && !dies) return 70 + defValue * 3 - oeTotal + groupKill
  if (kills && dies) return 40 + (defValue - atkValue) * 3 + groupKill
  if (dealt > 0 && !dies) return (oeTotal > 0 ? 3 : 15 + dealt) + groupMiss
  return (dealt > 0 ? 4 : 0) + groupMiss
}

/** Answer an intercept window: value the target we'd save minus the interceptor we'd risk (Guard is free). */
function interceptScore(state: GameState, action: GameAction & { type: 'intercept' | 'declineIntercept' }): number {
  if (action.type === 'declineIntercept') return 10
  const pa = state.pendingAttack
  const interceptor = state.units[action.unit]
  if (!pa || !interceptor) return 0
  const combined = pa.attackers.reduce((sum, id) => {
    const u = state.units[id]
    if (!u) return sum
    let p = effPower(state, u)
    const oe = kwOf(state, u, 'overextend')
    if (pa.overextend.includes(id) && typeof oe === 'number') p += oe
    return sum + p
  }, 0)
  const guard = hasKw(state, interceptor, 'guard')
  const intoInterceptor = Math.max(0, combined - effArmor(state, interceptor))
  const interceptorDies = intoInterceptor >= effHealth(state, interceptor) - interceptor.damage
  const interceptorValue = defOf(state, interceptor.id).cost + effPower(state, interceptor)
  let saved = 0
  if (pa.target.kind === 'unit') {
    const tgt = state.units[pa.target.id]
    if (tgt) {
      const intoTgt = Math.max(0, combined - effArmor(state, tgt))
      if (intoTgt >= effHealth(state, tgt) - tgt.damage) saved = (defOf(state, tgt.id).cost + effPower(state, tgt)) * 3
    }
  } else if (pa.target.kind === 'base') {
    saved = combined * 3 // preventing base damage is worth stepping in
  }
  return saved - (interceptorDies ? interceptorValue * 3 : 0) - (guard ? 0 : 6) + 12
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
      case 'setupBank': {
        // bank the expensive top of the curve — keep cheap early plays in hand
        score = 30 + action.cards.reduce((s, id) => s + defOf(state, id).cost, 0)
        break
      }
      case 'mulligan': score = 2; break // baseline bot keeps what it's dealt
      case 'attack': score = attackScore(state, action); break
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
      case 'claimInitiative': score = legal.some(x => x.type === 'attack' || x.type === 'play') ? 2 : 8; break
      case 'intercept':
      case 'declineIntercept': score = interceptScore(state, action); break
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
