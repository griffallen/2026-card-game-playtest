import type { GameAction, GameState, Seat, TargetRef, TargetSpec, UnitInstance, ZoneId } from './types.ts'
import { ZONES, adjacent, homeZone } from './types.ts'
import { defOf, effPower, hasKw, idNum, isSick, kwOf, other, pipGateSatisfied, unitsInZone, unitsOf } from './helpers.ts'
import { interceptCandidates } from './engine.ts'

/**
 * Every action `seat` may legally take right now. Mirrors applyAction's validation exactly —
 * the random-playout simulation asserts that nothing returned here ever throws.
 * Drives the UI (affordances) and any AI (a policy is just a chooser over this list).
 */
export function getLegalActions(state: GameState, seat: Seat): GameAction[] {
  if (state.winner !== null) return []
  if (seat !== state.actorSeat) return []
  const out: GameAction[] = []

  if (state.phase === 'setup') {
    // mulligan while a smaller hand could still bank (decision 32)
    const nextCount = state.rules.startingHandSize - (state.mulligans[seat] + 1) * state.rules.mulliganPenalty
    if (nextCount >= state.rules.startingResources) out.push({ type: 'mulligan' })
    // every combination of startingResources cards from hand — in london mode, crossed with
    // every combination of owed bottom cards from the remainder (decision 58)
    const hand = state.sides[seat].hand
    const n = state.rules.startingResources
    const owed = state.rules.mulliganStyle === 'london' ? state.mulligans[seat] * state.rules.mulliganPenalty : 0
    const combo: string[] = []
    const emitBottoms = (banks: string[]) => {
      if (!owed) { out.push({ type: 'setupBank', cards: banks }); return }
      const rest = hand.filter(id => !banks.includes(id))
      const bot: string[] = []
      const emitB = (start: number) => {
        if (bot.length === owed) { out.push({ type: 'setupBank', cards: banks, bottom: [...bot] }); return }
        for (let i = start; i < rest.length; i++) {
          bot.push(rest[i])
          emitB(i + 1)
          bot.pop()
        }
      }
      emitB(0)
    }
    const emit = (start: number) => {
      if (combo.length === n) { emitBottoms([...combo]); return }
      for (let i = start; i < hand.length; i++) {
        combo.push(hand[i])
        emit(i + 1)
        combo.pop()
      }
    }
    emit(0)
    return out
  }

  if (state.phase === 'bank') {
    if (state.bankedThisStep < state.rules.resourcesPerRound) {
      for (const card of state.sides[seat].hand) out.push({ type: 'resource', card })
    }
    out.push({ type: 'skipResource' })
    return out
  }

  if (state.phase === 'intercept') {
    const pa = state.pendingAttack
    if (!pa || seat !== other(pa.seat)) return []
    const out2: GameAction[] = [{ type: 'declineIntercept' }]
    for (const u of interceptCandidates(state, pa)) out2.push({ type: 'intercept', unit: u.id })
    return out2
  }

  out.push({ type: 'pass' })
  if (!state.claimedThisRound) out.push({ type: 'claimInitiative' })
  const ready = state.sides[seat].resources.filter(r => !r.exhausted).length

  // plays (both windows)
  for (const card of state.sides[seat].hand) {
    const def = defOf(state, card)
    if (def.cost > ready) continue
    if (!pipGateSatisfied(state, seat, def)) continue
    for (const targets of enumerateTargets(state, seat, card)) {
      out.push(targets.length ? { type: 'play', card, targets } : { type: 'play', card })
    }
  }

  // moves — both players act in their own windows now (decision 40; no active-player gate)
  for (const unit of unitsOf(state, seat)) {
    if (unit.exhausted || unit.imprisoned || isSick(state, unit)) continue
    const zones = hasKw(state, unit, 'flying') ? ZONES.filter(z => z !== unit.zone)
      : ZONES.filter(z => adjacent(z, unit.zone))
    for (const to of zones) out.push({ type: 'move', unit: unit.id, to })
  }

  // attacks (decision 42): each ready unit alone, plus one full-group per (zone, shared target). No guard-forcing.
  const attackers = unitsOf(state, seat).filter(u => !u.exhausted && !u.imprisoned && !isSick(state, u) && !hasKw(state, u, 'cantAttack'))
  const byZone = new Map<ZoneId, UnitInstance[]>()
  for (const u of attackers) byZone.set(u.zone, [...(byZone.get(u.zone) ?? []), u])
  for (const [, group] of byZone) {
    const targetsHere = new Map<string, TargetRef>()
    for (const u of group) for (const t of attackTargets(state, u)) targetsHere.set(JSON.stringify(t), t)
    for (const t of targetsHere.values()) {
      const able = group.filter(u => attackTargets(state, u).some(x => JSON.stringify(x) === JSON.stringify(t)))
      for (const u of able) {
        out.push({ type: 'attack', attackers: [u.id], target: t })
        if (typeof kwOf(state, u, 'overextend') === 'number')
          out.push({ type: 'attack', attackers: [u.id], target: t, overextend: [u.id] })
      }
      if (able.length > 1) {
        const ids = able.map(u => u.id)
        out.push({ type: 'attack', attackers: ids, target: t })
        const oe = able.filter(u => typeof kwOf(state, u, 'overextend') === 'number').map(u => u.id)
        if (oe.length) out.push({ type: 'attack', attackers: ids, target: t, overextend: oe })
      }
    }
  }
  return out
}

function attackTargets(state: GameState, attacker: UnitInstance): TargetRef[] {
  const seat = attacker.owner
  const enemy = other(seat)
  const ranged = hasKw(state, attacker, 'ranged')
  const reach = hasKw(state, attacker, 'reach')
  const out: TargetRef[] = []

  const zonesInReach: ZoneId[] = [attacker.zone]
  if (ranged || reach) for (const z of ZONES) if (adjacent(z, attacker.zone)) zonesInReach.push(z)

  for (const zone of zonesInReach) {
    for (const d of unitsInZone(state, zone, enemy)) out.push({ kind: 'unit', id: d.id })
  }

  // base: melee/reach only, standing in the enemy home zone (protection is now the intercept window, decision 42)
  if (!ranged && attacker.zone === homeZone(enemy)) {
    out.push({ kind: 'base', seat: enemy })
  }
  return out
}

/**
 * All target combinations for playing `card`.
 * Returns [[]] when the card needs no targets, [] when required targets don't exist.
 * Each slot contributes a list of choices; a choice is one-or-more refs (count-2 specs bundle pairs).
 */
function enumerateTargets(state: GameState, seat: Seat, card: string): TargetRef[][] {
  const def = defOf(state, card)
  const slotChoices: TargetRef[][][] = []

  if (def.type === 'upgrade') {
    const carriers = unitsOf(state, seat)
    if (!carriers.length) return []
    slotChoices.push(carriers.map(u => [{ kind: 'unit', id: u.id } as TargetRef]))
  }

  for (const spec of def.targets ?? []) {
    const candidates = candidatesFor(state, seat, spec)
    const count = spec.count ?? 1
    if (candidates.length < count) return []
    if (count === 1) {
      slotChoices.push(candidates.map(c => [c]))
    } else {
      const pairs: TargetRef[][] = []
      for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) pairs.push([candidates[i], candidates[j]])
      }
      slotChoices.push(pairs)
    }
  }

  let combos: TargetRef[][] = [[]]
  for (const choices of slotChoices) {
    const next: TargetRef[][] = []
    for (const acc of combos) {
      for (const choice of choices) {
        if (choice.some(v => v.kind === 'unit' && acc.some(a => a.kind === 'unit' && a.id === v.id))) continue
        next.push([...acc, ...choice])
        if (next.length > 400) break // safety valve; more combos than any UI or sim needs
      }
    }
    combos = next
  }
  return combos
}

function candidatesFor(state: GameState, seat: Seat, spec: TargetSpec): TargetRef[] {
  const out: TargetRef[] = []
  if (spec.t === 'zone') return ZONES.map(zone => ({ kind: 'zone', zone }))
  if (spec.t === 'upgrade') {
    for (const up of Object.values(state.upgrades).sort((a, b) => idNum(a.id) - idNum(b.id))) {
      if (spec.side === 'enemy' && up.owner === seat) continue
      if (spec.side === 'friendly' && up.owner !== seat) continue
      out.push({ kind: 'upgrade', id: up.id })
    }
    return out
  }
  for (const u of unitsOf(state)) {
    if (spec.side === 'enemy' && u.owner === seat) continue
    if (spec.side === 'friendly' && u.owner !== seat) continue
    if (spec.maxPower !== undefined && effPower(state, u) > spec.maxPower) continue
    if (spec.withKw && !hasKw(state, u, spec.withKw)) continue
    if (spec.mustBeDamaged && u.damage <= 0) continue
    if (u.owner !== seat && hasKw(state, u, 'untargetable')) continue
    out.push({ kind: 'unit', id: u.id })
  }
  if (spec.t === 'unitOrBase') {
    const sides: Seat[] = (spec.baseSide ?? 'enemy') === 'any' ? [0, 1] : [other(seat)]
    for (const s of sides) out.push({ kind: 'base', seat: s })
  }
  return out
}

