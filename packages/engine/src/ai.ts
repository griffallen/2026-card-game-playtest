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

/** How many units this seat currently holds imprisoned (each costs prisonDecayPerUnit influence per round — the mortgage). */
const heldPrisoners = (state: GameState, seat: Seat): number =>
  Object.values(state.units).filter(u => u.imprisoned?.by === seat).length

/** Value of killing this unit beyond its stats: freeing every friendly it jails. */
function jailerBonus(state: GameState, seat: Seat, victim: UnitInstance): number {
  let bonus = 0
  for (const u of Object.values(state.units)) {
    if (u.owner === seat && u.imprisoned?.source === victim.id) bonus += (defOf(state, u.id).cost + effPower(state, u)) * 2
  }
  return bonus
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

  const freed = jailerBonus(state, units[0].owner, defender)
  if (kills && !dies) return 70 + defValue * 3 + freed - oeTotal + groupKill
  if (kills && dies) return 40 + (defValue - atkValue) * 3 + freed + groupKill
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

  // actions/upgrades: score the ops against the actual chosen targets —
  // a target-blind bot burns 1/1s and jails tokens, and every sim conclusion inherits that.
  let score = 12 + def.cost
  const ref = (i: number) => action.targets?.[i]
  const unitAt = (i: number) => {
    const r = ref(i)
    return r && r.kind === 'unit' ? state.units[r.id] : undefined
  }
  const chosenIdx = (t: unknown): number | null => (t === 'chosen0' ? 0 : t === 'chosen1' ? 1 : null)
  const stockValue = (u: UnitInstance) => defOf(state, u.id).cost + effPower(state, u)

  for (const op of def.onPlay ?? []) {
    switch (op.op) {
      case 'influence': score += op.n > 0 ? op.n * 4 : op.n * 2; break
      case 'draw': score += op.n * 3; break
      case 'ready': score += 6; break
      case 'damage': {
        // n:'linked' (Blood Rush) deliberately stays unranked — the cast keeps the shipped
        // bot's arithmetic (and the frozen sim baselines) bit-identical.
        const dmg = op.n as number
        const i = chosenIdx(op.t)
        if (i === null) { score += dmg; break }
        const r = ref(i)
        if (r?.kind === 'base') { score += r.seat !== seat ? dmg * 3 : -25; break }
        const u = unitAt(i)
        if (!u) break
        if (u.owner === seat) { score -= 25; break }
        const remaining = effHealth(state, u) - u.damage
        const through = Math.max(0, dmg - effArmor(state, u))
        score += Math.min(through, remaining) * 2
        if (through >= remaining) score += stockValue(u) * 2 + jailerBonus(state, seat, u)
        break
      }
      case 'destroy': {
        const u = unitAt(chosenIdx(op.t) ?? -1)
        if (!u) break
        if (u.owner !== seat) score += stockValue(u) * 2 + jailerBonus(state, seat, u)
        else score -= 25 // Execution Swing on our own damaged unit is not a play, it's a suicide
        break
      }
      case 'imprison': {
        const i = chosenIdx((op as { t?: unknown }).t)
        const u = i !== null ? unitAt(i) : undefined
        if (u) {
          if (u.owner === seat || u.imprisoned) { score -= 25; break }   // jailing our own / the already-jailed
          score += stockValue(u) * 2 - heldPrisoners(state, seat) * 3    // decay mortgage awareness
        } else score += 10                                               // auto/filter imprisons
        break
      }
      case 'heal': {
        if (op.t === 'selfBase') { score += Math.min(op.n, state.rules.startingLife - state.sides[seat].life) * 2; break }
        const u = unitAt(chosenIdx(op.t) ?? -1)
        if (u) score += Math.min(op.n, u.damage) * 2
        break
      }
      case 'buff': {
        const u = unitAt(chosenIdx(op.t) ?? -1)
        if (!u) break
        const net = (op.p ?? 0) + (op.h ?? 0) + (op.armor ?? 0)
        if (u.owner === seat) score += net < 0 ? -25 : net * 2
        else score += net < 0 ? Math.min(-net, effPower(state, u)) * 2 : -20 // wither their attacker, never pump it
        break
      }
      case 'grant': {
        const u = unitAt(chosenIdx(op.t) ?? -1)
        if (!u) break
        const pacify = op.kw?.k === 'cantAttack'
        if (u.owner === seat) score += pacify ? -25 : 4
        else score += pacify ? effPower(state, u) * 1.5 : -20
        break
      }
      case 'double': {
        const u = unitAt(chosenIdx(op.t) ?? -1)
        if (!u) break
        score += u.owner === seat ? effPower(state, u) * 1.5 : -25
        break
      }
      case 'damageFilter': {
        // AoE: value every unit the filter actually reaches (enemy hits earn, friendly-fire costs)
        const f = op.f as { side?: string; zone?: string }
        const chosenZone = action.targets?.find(t => t.kind === 'zone') as { kind: 'zone'; zone: number } | undefined
        for (const u of Object.values(state.units)) {
          if (f.side === 'enemy' && u.owner === seat) continue
          if (f.side === 'friendly' && u.owner !== seat) continue
          if (f.zone === 'chosenZone') { if (!chosenZone || u.zone !== chosenZone.zone) continue }
          else if (f.zone && f.zone !== 'all') continue // sameAsSelf/adjacentToSelf never appear on actions
          const remaining = effHealth(state, u) - u.damage
          const through = Math.max(0, op.n - effArmor(state, u))
          const dealt = Math.min(through, remaining)
          if (u.owner !== seat) score += dealt * 1.5 + (through >= remaining ? stockValue(u) + jailerBonus(state, seat, u) : 0)
          else score -= dealt * 1.5 + (through >= remaining ? stockValue(u) : 0)
        }
        break
      }
    }
  }
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
