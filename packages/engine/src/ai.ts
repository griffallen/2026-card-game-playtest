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
  const pw = (u: UnitInstance) => effPower(state, u)
  const combined = units.reduce((sum, u) => sum + pw(u), 0)
  const groupKill = 2 * (n - 1)   // focus-fire that converts a kill is good
  const groupMiss = -3 * (n - 1)  // over-committing into a wall is bad

  if (action.target.kind === 'base') {
    // designer doctrine (#25): "always favor damage to a base, then unit removal"
    return 120 + combined * 5 + groupKill
  }
  if (action.target.kind !== 'unit') return 0
  const defender = state.units[action.target.id]
  if (!defender) return 0
  const dealt = Math.max(0, combined - effArmor(state, defender))
  const defRemaining = effHealth(state, defender) - defender.damage
  const kills = dealt >= defRemaining
  const defValueV3 = defOf(state, defender.id).cost + effPower(state, defender)

  if (state.rules.combatModel === 'blockerPairing') {
    // v3 costing (decision 84): the target strikes EVERY unblocked attacker back at full
    // power — cost the swing by the attackers retaliation would fell (blocks are the
    // defender's unknown; assume the worst honest case: nobody blocks, everyone bleeds)
    const retaliates = state.rules.retaliation === 'always'
      || (state.rules.retaliation === 'ready' && !defender.exhausted)
    const tPow = retaliates ? effPower(state, defender) : 0
    let lostValue = 0
    for (const u of units) {
      if (Math.max(0, tPow - effArmor(state, u)) >= effHealth(state, u) - u.damage) {
        lostValue += defOf(state, u.id).cost + effPower(state, u)
      }
    }
    if (kills && lostValue === 0) return 70 + defValueV3 * 3 + groupKill
    if (kills) return 40 + defValueV3 * 3 - lostValue * 2.5 + groupKill
    if (dealt > 0) return 12 + dealt - lostValue * 2 + groupMiss
    return groupMiss
  }
  // counter lands on the highest-power attacker (ties → lowest id) — mirror the engine
  const counterTarget = units.slice().sort((x, y) => pw(y) - pw(x) || idNum(x.id) - idNum(y.id))[0]
  const ctRemaining = effHealth(state, counterTarget) - counterTarget.damage
  const counter = Math.max(0, effPower(state, defender) - effArmor(state, counterTarget))
  const dies = counter >= ctRemaining
  const defValue = defOf(state, defender.id).cost + effPower(state, defender)
  const atkValue = defOf(state, counterTarget.id).cost + effPower(state, counterTarget)

  if (kills && !dies) return 70 + defValue * 3 + groupKill
  if (kills && dies) return 40 + (defValue - atkValue) * 3 + groupKill
  if (dealt > 0 && !dies) return 15 + dealt + groupMiss
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
    return u ? sum + effPower(state, u) : sum
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

/** Answer a v3 block window: attackers our counters fell + damage kept off the target/base,
 *  minus blockers we lose — and letting it through is priced with retaliation in mind. */
function blockScore(state: GameState, seat: Seat, action: GameAction & { type: 'block' }): number {
  const pa = state.pendingAttack
  if (!pa) return 0
  const val = (u: UnitInstance) => defOf(state, u.id).cost + effPower(state, u)
  const target = pa.target.kind === 'unit' ? state.units[pa.target.id] : undefined
  const byAttacker = new Map<string, UnitInstance[]>()
  for (const p of action.pairs) {
    const b = state.units[p.blocker]
    if (b) byAttacker.set(p.onto, [...(byAttacker.get(p.onto) ?? []), b])
  }
  let score = 8
  let unblockedPow = 0
  let totalPow = 0
  for (const aid of pa.attackers) {
    const a = state.units[aid]
    if (!a) continue
    const aPow = effPower(state, a)
    totalPow += aPow
    const blockers = byAttacker.get(aid) ?? []
    if (!blockers.length) { unblockedPow += aPow; continue }
    const counter = blockers.reduce((s2, b) => s2 + effPower(state, b), 0)
    if (Math.max(0, counter - effArmor(state, a)) >= effHealth(state, a) - a.damage) score += val(a) * 2.5
    let dmg = aPow
    for (const b of blockers) {
      const gross = Math.max(0, effHealth(state, b) - b.damage) + effArmor(state, b)
      const chunk = Math.min(dmg, gross)
      if (gross > 0 && chunk >= gross) {
        // #68: charge the death penalty by REMAINING stock, not full sticker price — a two-sevenths
        // wall is nearly spent, so spending it on a winning block is cheap. frac=1 for fresh blockers
        // (undamaged) → their scores stay bit-identical, no regression.
        const frac = Math.max(0, effHealth(state, b) - b.damage) / Math.max(1, effHealth(state, b))
        score -= val(b) * (hasKw(state, b, 'guard') ? 1.6 : 2) * frac
      }
      dmg -= chunk
      if (!hasKw(state, b, 'guard')) score -= 2   // the readiness spent
    }
    if (dmg > 0 && hasKw(state, a, 'breakthrough')) unblockedPow += dmg
  }
  if (pa.target.kind === 'base') {
    score += (totalPow - unblockedPow) * 3        // damage kept off our face
  } else if (target) {
    const remaining = effHealth(state, target) - target.damage
    const through = Math.max(0, unblockedPow - effArmor(state, target))
    if (through >= remaining) score -= val(target) * 2.5
    else score -= through * 1.5
    // decision 84 + 105 (#84): whatever we DON'T block, our target punches back — but the strike
    // is DIVIDED across the unblocked attackers, poured highest-power-first, so count only the kills
    // the pool can actually pay for (the engine's default order; the bot never supplies its own).
    const retaliates = state.rules.retaliation === 'always' || (state.rules.retaliation === 'ready' && !target.exhausted)
    if (retaliates && through < remaining) {
      let pool = effPower(state, target)
      const unblocked = pa.attackers
        .map(aid => state.units[aid])
        .filter((a): a is UnitInstance => !!a && (byAttacker.get(a.id) ?? []).length === 0)
        .sort((x, y) => effPower(state, y) - effPower(state, x) || idNum(x.id) - idNum(y.id))
      for (const a of unblocked) {
        if (pool <= 0) break
        const gross = Math.max(0, effHealth(state, a) - a.damage) + effArmor(state, a)
        if (gross > 0 && pool >= gross) score += val(a) * 2   // the divided blow fells this one
        pool -= Math.min(pool, gross)
      }
    }
  }
  return score
}

/** #128 (Breakthrough chain): the DEFENDER places the attacker's leftover on one of THEIR OWN bodies
 *  (or their base), so the bot minimizes its own loss — soak with a survivor if one can, else spend
 *  Life on the base to spare good units, else sacrifice the cheapest body. (Note: unlike retaliation's
 *  "biggest threat first" — which orders enemy attackers — this orders the defender's own units, so
 *  the sane default is loss-minimizing, not power-maximizing.) Deterministic; ties broken by seeded
 *  jitter in the policy. The phase is always answerable, so the bot never strands the chain in a sim. */
function splashScore(state: GameState, action: GameAction & { type: 'splash' }): number {
  const ps = state.pendingSplash
  if (!ps) return 0
  const ref = action.target
  if (ref.kind === 'base') return -ps.leftover              // lose Life, keep every unit, chain ends
  const u = ref.kind === 'unit' ? state.units[ref.id] : undefined
  if (!u) return -100
  const warded = !!u.blockWard
  const shielded = u.shielded && !ps.pierced
  const gross = Math.max(0, effHealth(state, u) - u.damage) + (ps.pierced ? 0 : effArmor(state, u))
  if (warded || shielded || ps.leftover < gross) return 5   // soaks it and lives — the defender loses nothing
  // this body is felled; the remainder chains on
  return -(defOf(state, u.id).cost + effPower(state, u)) - (ps.leftover - gross) * 0.5
}

/** Score an exhaust-activated ability: a volley's damage or a Sneak payload, against its chosen target. */
function activateScore(state: GameState, seat: Seat, action: GameAction & { type: 'activate' }): number {
  const unit = state.units[action.unit]
  if (!unit) return 0
  const def = defOf(state, unit.id)
  const ref = action.targets?.[0]
  const tgt = ref && ref.kind === 'unit' ? state.units[ref.id] : undefined
  const rangedN = kwOf(state, unit, 'ranged')
  const ops: { op: string; n?: number | string }[] = def.sneak?.ops
    ?? (typeof rangedN === 'number' ? [{ op: 'damage', n: rangedN }] : [])
  let score = 6
  for (const op of ops) {
    if (op.op === 'damage' && typeof op.n === 'number') {
      if (ref?.kind === 'base') { score += op.n * 3; continue }
      if (!tgt) continue
      const remaining = effHealth(state, tgt) - tgt.damage
      const through = Math.max(0, op.n - effArmor(state, tgt))
      score += Math.min(through, remaining) * 2
      if (through >= remaining) score += (defOf(state, tgt.id).cost + effPower(state, tgt)) * 2
    } else if (op.op === 'influence' && typeof op.n === 'number') score += op.n * 4
    else score += 4
  }
  return score
}

function playScore(state: GameState, seat: Seat, action: GameAction & { type: 'play' }): number {
  const def = defOf(state, action.card)
  if (def.type === 'unit') {
    let score = 45 + def.cost * 3 // develop the board, biggest first
    // #68 (bounded): value yellow's defensive tools by the SITUATION, not just by size, so the bot
    // plays them instead of hoarding bigger bodies. A defender is worth deploying when threatened;
    // a capture-on-arrival is removal — worth the stock of whoever it arrests.
    const underThreat = unitsInZone(state, homeZone(seat), other(seat)).length > 0 || state.sides[seat].life <= 10
    if (underThreat && (def.kw ?? []).some(k => k.k === 'guard' || k.k === 'cantAttack')) score += 14
    if ((def.onPlay ?? []).some(op => op.op === 'capture')) {
      const r = action.targets?.[0]
      const u = r?.kind === 'unit' ? state.units[r.id] : undefined
      if (u && u.owner !== seat) score += (defOf(state, u.id).cost + effPower(state, u)) * 1.5
    }
    return score
  }

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

  if (def.xCost) {
    // issue #45: value the surge against its influence bleed — favor a solid mid X, and only
    // when the pumped unit can actually swing this round
    const x = action.x ?? 0
    const u = action.targets?.[0]?.kind === 'unit' ? state.units[action.targets[0].id] : undefined
    if (!u || u.exhausted || x === 0) return 1
    return 10 + x * 4 - Math.max(0, x - 3) * 6
  }
  for (const op of def.onPlay ?? []) {
    switch (op.op) {
      case 'influence': score += op.n > 0 ? op.n * 4 : op.n * 2; break
      case 'draw': score += (op.n ?? op.upTo ?? 0) * 3; break   // #122: upTo scores by its target (existing n cards unchanged)
      case 'ready': score += 6; break
      case 'revealHand': break   // #122 (Twilight Scout): the heuristic bot is omniscient — it already sees every hand, so a peek is worth 0 (the card scores as its vanilla body). This is exactly why the sim UNDERVALUES it: its whole point is human-only info.
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
        if (through >= remaining) score += stockValue(u) * 2
        break
      }
      case 'destroy': {
        const u = unitAt(chosenIdx(op.t) ?? -1)
        if (!u) break
        if (u.owner !== seat) score += stockValue(u) * 2
        else score -= 25 // Execution Swing on our own damaged unit is not a play, it's a suicide
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
          if (u.owner !== seat) score += dealt * 1.5 + (through >= remaining ? stockValue(u) : 0)
          else score -= dealt * 1.5 + (through >= remaining ? stockValue(u) : 0)
        }
        break
      }
    }
  }
  // #80 (Subjugate): an enemy-attach upgrade is removal by degrees — value the power it actually
  // strips from the chosen host. Guarded on attach.side, so the shipped bot's arithmetic for
  // every existing card (and the frozen sim baselines) stays bit-identical.
  if (def.attach?.side === 'enemy') {
    const host = unitAt(0)
    if (host) for (const st of def.statics ?? []) {
      if (st.s !== 'aura' || st.scope !== 'attached') continue
      const strip = -((st.p ?? 0) + (st.pPerHostPip ?? 0) * (defOf(state, host.id).pips?.length ?? 0))
      if (strip > 0) score += Math.min(strip, effPower(state, host)) * 2
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
  let score: number
  if (hasKw(state, unit, 'cantAttack')) score = toward ? 2 : 1 // walls mostly hold home
  else {
    const enemiesAtDest = unitsInZone(state, action.to, other(seat)).length
    score = toward ? 18 + power : 3
    if (action.to === enemyHome && enemiesAtDest === 0) score += 10 // open lane to the base
  }
  // decision 88 (Tribune, renamed from Politician in #125): campaign in the middle — tribunes march to
  // Neutral, and escorts follow when a tribune of ours stands (or will stand) there without a majority
  if (action.to === 1) {
    const polMoving = hasKw(state, unit, 'tribune')
    const polThere = unitsInZone(state, 1, seat).some(u => hasKw(state, u, 'tribune'))
    if (polMoving || polThere) {
      const mine = unitsInZone(state, 1, seat).length
      const theirs = unitsInZone(state, 1, other(seat)).length
      if (mine <= theirs) score += polMoving ? 12 : 8
    }
  }
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
      case 'attack': {
        score = attackScore(state, action)
        // PR #46: the skewer pick rides the attack — reward enemy wounds and kills, tax friendly fire
        for (const sp of action.splash ?? []) {
          const v = state.units[sp.unit]
          if (!v) continue
          score += v.owner === seat ? -5 : (v.damage + 1 >= effHealth(state, v) ? 12 : 3)
        }
        break
      }
      case 'play': score = playScore(state, seat, action); break
      case 'move': score = moveScore(state, seat, action); break
      case 'resource': {
        const ready = state.sides[seat].resources.filter(r => !r.exhausted).length
        // bank early and when flooded; slow down once the economy is online
        score = ready < 4 ? 55 : handSize >= 5 ? 40 : 12
        const card = defOf(state, action.card)
        score -= card.cost // prefer banking cheap spares, keep the threats
        // #68: don't turn a needed defender into copper. When enemies stand in our Home or we're
        // low on life, a Guard/wall in hand is a shield, not a spare — tax banking it away.
        const isDefender = card.type === 'unit' && (card.kw ?? []).some(k => k.k === 'guard' || k.k === 'cantAttack')
        if (isDefender && (unitsInZone(state, homeZone(seat), other(seat)).length > 0 || state.sides[seat].life <= 8)) {
          score -= 40
        }
        break
      }
      case 'skipResource': score = 8; break
      case 'pass': score = 1; break
      case 'claimInitiative': score = legal.some(x => x.type === 'attack' || x.type === 'play') ? 2 : 8; break
      case 'intercept':
      case 'declineIntercept': score = interceptScore(state, action); break
      case 'resolveChoice':
        // #122 (pick-from-hand): shed the priciest card first — highest printed cost wins (an X-cost
        // card counts as 0, kept). The chosen card is in state.actorSeat's hand (the seat now choosing,
        // caster or Obscure's opponent), so def.cost picks correctly for whichever seat. The seeded
        // jitter below breaks ties deterministically; the second prompt naturally takes the next-priciest.
        // Deliberately crude — enough to run games and feed the #97/#98 corpus.
        score = defOf(state, action.card).cost
        break
      case 'block': score = blockScore(state, seat, action); break
      case 'splash': score = splashScore(state, action); break
      case 'activate': score = activateScore(state, seat, action); break
      case 'attachOrphan': score = 10; break
      case 'passUpgrade': score = 3; break   // #86: the bot rarely shuffles the banner — tempo self-regulates; never crash on it
      case 'concede': score = -Infinity; break
    }
    let jitter: number
    ;[jitter, s] = rngNext(s)
    score += jitter // deterministic tiebreak + loop-breaker
    if (score > bestScore) { bestScore = score; best = action }
  }
  // safety: influence check — never play a big influence-ceding card if it would lose the game outright
  if (best.type === 'play') {
    const def = defOf(state, best.card)
    const cede = (def.onPlay ?? []).reduce((n, op) => (op.op === 'influence' && op.n < 0 ? n + op.n : n), 0)
    if (cede < 0 && influenceFor(state, seat) + cede <= -state.rules.hopeWinThreshold + 1) {
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
