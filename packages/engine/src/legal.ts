import type { GameAction, GameState, Seat, TargetRef, TargetSpec, UnitInstance, ZoneId } from './types.ts'
import { ZONES, adjacent, homeZone } from './types.ts'
import { defOf, effPower, hasKw, idNum, isSick, other, unitsInZone, unitsOf } from './helpers.ts'

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
    // every combination of startingResources cards from hand
    const hand = state.sides[seat].hand
    const n = state.rules.startingResources
    const combo: string[] = []
    const emit = (start: number) => {
      if (combo.length === n) { out.push({ type: 'setupBank', cards: [...combo] }); return }
      for (let i = start; i < hand.length; i++) {
        combo.push(hand[i])
        emit(i + 1)
        combo.pop()
      }
    }
    emit(0)
    return out
  }

  if (state.phase === 'resource') {
    if (state.resourcedThisTurn < state.rules.resourcesPerTurn) {
      for (const card of state.sides[seat].hand) out.push({ type: 'resource', card })
    }
    out.push({ type: 'skipResource' })
    return out
  }

  out.push({ type: 'pass' })
  const isActive = seat === state.activeSeat
  const ready = state.sides[seat].resources.filter(r => !r.exhausted).length

  // plays (both windows)
  for (const card of state.sides[seat].hand) {
    const def = defOf(state, card)
    if (def.cost > ready) continue
    for (const targets of enumerateTargets(state, seat, card)) {
      out.push(targets.length ? { type: 'play', card, targets } : { type: 'play', card })
    }
  }

  if (isActive) {
    for (const unit of unitsOf(state, seat)) {
      if (unit.exhausted || unit.imprisoned || isSick(state, unit)) continue
      // moves
      const zones = hasKw(state, unit, 'flying') ? ZONES.filter(z => z !== unit.zone)
        : ZONES.filter(z => adjacent(z, unit.zone))
      for (const to of zones) out.push({ type: 'move', unit: unit.id, to })
      // attacks
      if (!hasKw(state, unit, 'cantAttack')) {
        for (const target of attackTargets(state, unit)) out.push({ type: 'attack', attacker: unit.id, target })
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
    const defenders = unitsInZone(state, zone, enemy)
    if (!defenders.length) continue
    const guards = defenders.filter(u => !u.imprisoned && hasKw(state, u, 'guard'))
    const eligible = guards.length ? guards : defenders
    for (const d of eligible) out.push({ kind: 'unit', id: d.id })
  }

  // base: melee/reach only, standing in the enemy home zone, no ready guards there
  if (!ranged && attacker.zone === homeZone(enemy)) {
    const guards = unitsInZone(state, attacker.zone, enemy).filter(u => !u.imprisoned && hasKw(state, u, 'guard'))
    if (!guards.length) out.push({ kind: 'base', seat: enemy })
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

