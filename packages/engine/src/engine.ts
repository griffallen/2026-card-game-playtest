import type {
  GameAction, GameState, LogLine, Seat, TargetRef, TargetSpec, UnitInstance, ZoneId,
} from './types.ts'
import { EngineError, adjacent, homeZone } from './types.ts'
import { shuffle } from './rng.ts'
import {
  defOf, effArmor, effPower, hasKw, isSick, kwOf, log, other, unitsInZone, unitsOf,
} from './helpers.ts'
import { damageBase, damageUnit, fireTrigger, runOps, stateBasedCleanup } from './effects.ts'
import { endTurn, startTurn } from './turn.ts'

export interface ApplyResult { state: GameState; events: LogLine[] }

function fail(code: string, msg: string): never { throw new EngineError(code, msg) }

/**
 * The reducer: (state, action, actor) → next state. Pure — clones, never mutates the input.
 * Throws EngineError on any illegal action; a thrown action changes nothing.
 */
export function applyAction(prev: GameState, action: GameAction, actorSeat: Seat): ApplyResult {
  if (prev.winner !== null) fail('game-over', 'the game is over')
  const state = structuredClone(prev)
  const logStart = state.log.length

  if (action.type === 'concede') {
    state.winner = other(actorSeat)
    state.winReason = 'concede'
    log(state, actorSeat, `${state.sides[actorSeat].name} concedes`)
    return { state, events: state.log.slice(logStart) }
  }

  if (actorSeat !== state.actorSeat) fail('not-your-window', 'not your action window')

  if (state.phase === 'setup') {
    applySetupPhase(state, action, actorSeat)
  } else if (state.phase === 'resource') {
    applyResourcePhase(state, action, actorSeat)
  } else {
    applyMainPhase(state, action, actorSeat)
  }

  stateBasedCleanup(state, actorSeat)
  return { state, events: state.log.slice(logStart) }
}

/** Setup phase: mulligan as often as you dare (decision 32), then choose your banks (decision 31). */
function applySetupPhase(state: GameState, action: GameAction, seat: Seat) {
  if (action.type === 'mulligan') {
    const side = state.sides[seat]
    const nextCount = state.rules.startingHandSize - (state.mulligans[seat] + 1) * state.rules.mulliganPenalty
    if (nextCount < state.rules.startingResources) {
      fail('mulligan-floor', `a smaller hand couldn't bank ${state.rules.startingResources} resources`)
    }
    side.deck.push(...side.hand)
    side.hand = []
    ;[side.deck, state.rngState] = shuffle(side.deck, state.rngState)
    for (let i = 0; i < nextCount; i++) {
      const id = side.deck.pop()
      if (id) side.hand.push(id)
    }
    state.mulligans[seat] += 1
    log(state, seat, `${side.name} mulligans to ${nextCount} cards`)
    return // same player decides again: mulligan further or bank
  }
  if (action.type !== 'setupBank') fail('bad-phase', `setup: mulligan, or choose ${state.rules.startingResources} cards to bank`)
  const n = state.rules.startingResources
  if (action.cards.length !== n) fail('bad-setup', `choose exactly ${n} cards to bank`)
  if (new Set(action.cards).size !== n) fail('bad-setup', 'banked cards must be distinct')
  const side = state.sides[seat]
  for (const id of action.cards) {
    if (!side.hand.includes(id)) fail('not-in-hand', 'card is not in your hand')
  }
  for (const id of action.cards) {
    side.hand.splice(side.hand.indexOf(id), 1)
    side.resources.push({ id, exhausted: false })
  }
  state.setupBanked[seat] = true
  log(state, seat, `${side.name} banks ${action.cards.map(id => defOf(state, id).name).join(' and ')} as starting resources`)
  const other_ = other(seat)
  if (!state.setupBanked[other_]) {
    state.actorSeat = other_
  } else {
    startTurn(state) // both banked — turn 1 begins
  }
}

function applyResourcePhase(state: GameState, action: GameAction, seat: Seat) {
  if (action.type === 'resource') {
    if (state.resourcedThisTurn >= state.rules.resourcesPerTurn) fail('resource-cap', 'already resourced this turn')
    const side = state.sides[seat]
    const idx = side.hand.indexOf(action.card)
    if (idx < 0) fail('not-in-hand', 'card is not in your hand')
    side.hand.splice(idx, 1)
    side.resources.push({ id: action.card, exhausted: false })
    state.resourcedThisTurn += 1
    log(state, seat, `${side.name} banks ${defOf(state, action.card).name} as a resource (${side.resources.length})`)
  } else if (action.type !== 'skipResource') {
    fail('bad-phase', 'resource phase: resource a card or skip')
  }
  if (state.resourcedThisTurn >= state.rules.resourcesPerTurn || action.type === 'skipResource') {
    state.phase = 'main'
    state.actorSeat = state.activeSeat
    state.passStreak = 0
  }
}

function applyMainPhase(state: GameState, action: GameAction, seat: Seat) {
  const isActive = seat === state.activeSeat
  switch (action.type) {
    case 'pass': {
      state.passStreak += 1
      if (state.passStreak >= 2) { endTurn(state, seat); return }
      state.actorSeat = other(seat)
      return
    }
    case 'play': playCard(state, action, seat); break
    case 'move': {
      if (!isActive) fail('off-turn', 'you can only move on your turn')
      moveUnit(state, action.unit, action.to, seat)
      break
    }
    case 'attack': {
      if (!isActive) fail('off-turn', 'you can only attack on your turn')
      attack(state, action.attacker, action.target, seat, action.overextend ?? false)
      break
    }
    default: fail('bad-phase', `${(action as GameAction).type} is not a main-phase action`)
  }
  state.passStreak = 0
  state.actorSeat = other(seat)
}

// ─── Playing cards ───────────────────────────────────────────────────────────

function payCost(state: GameState, seat: Seat, cost: number) {
  const ready = state.sides[seat].resources.filter(r => !r.exhausted)
  if (ready.length < cost) fail('cant-pay', `costs ${cost}, only ${ready.length} ready resources`)
  for (let i = 0; i < cost; i++) ready[i].exhausted = true
}

function validateTargets(state: GameState, seat: Seat, specs: TargetSpec[], targets: TargetRef[], cardName: string) {
  const expected = specs.reduce((s, spec) => s + (spec.count ?? 1), 0)
  if (targets.length !== expected) fail('bad-targets', `${cardName} needs ${expected} target(s)`)
  let i = 0
  const seen = new Set<string>()
  for (const spec of specs) {
    for (let c = 0; c < (spec.count ?? 1); c++, i++) {
      const ref = targets[i]
      if (spec.t === 'zone') {
        if (ref.kind !== 'zone') fail('bad-targets', 'expected a zone target')
        continue
      }
      if (spec.t === 'upgrade') {
        if (ref.kind !== 'upgrade') fail('bad-targets', 'expected an upgrade target')
        const up = state.upgrades[ref.id] ?? fail('bad-targets', 'no such upgrade')
        if (spec.side === 'enemy' && up.owner === seat) fail('bad-targets', 'must target an enemy upgrade')
        continue
      }
      if (ref.kind === 'base') {
        if (spec.t !== 'unitOrBase') fail('bad-targets', 'cannot target a base')
        if ((spec.baseSide ?? 'enemy') === 'enemy' && ref.seat === seat) fail('bad-targets', 'cannot target your own base')
        continue
      }
      if (ref.kind !== 'unit') fail('bad-targets', 'expected a unit target')
      if (seen.has(ref.id)) fail('bad-targets', 'targets must be distinct')
      seen.add(ref.id)
      const u = state.units[ref.id] ?? fail('bad-targets', 'no such unit')
      if (spec.side === 'enemy' && u.owner === seat) fail('bad-targets', 'must target an enemy unit')
      if (spec.side === 'friendly' && u.owner !== seat) fail('bad-targets', 'must target a friendly unit')
      if (spec.maxPower !== undefined && effPower(state, u) > spec.maxPower) fail('bad-targets', `target power exceeds ${spec.maxPower}`)
      if (spec.withKw && !hasKw(state, u, spec.withKw)) fail('bad-targets', `target must have ${spec.withKw}`)
      if (spec.mustBeDamaged && u.damage <= 0) fail('bad-targets', 'target must be damaged')
      // Chain of Law: enemy units with `untargetable` can't be chosen by enemy card effects
      if (u.owner !== seat && hasKw(state, u, 'untargetable')) fail('bad-targets', `${defOf(state, u.id).name} cannot be targeted`)
    }
  }
}

function playCard(state: GameState, action: Extract<GameAction, { type: 'play' }>, seat: Seat) {
  const side = state.sides[seat]
  const idx = side.hand.indexOf(action.card)
  if (idx < 0) fail('not-in-hand', 'card is not in your hand')
  const def = defOf(state, action.card)
  const targets = action.targets ?? []

  if (def.type === 'upgrade') {
    // implicit attach target first, then any card-specific targets
    const attachRef = targets[0]
    if (!attachRef || attachRef.kind !== 'unit') fail('bad-targets', 'upgrades attach to a friendly unit')
    const carrier = state.units[attachRef.id] ?? fail('bad-targets', 'no such unit')
    if (carrier.owner !== seat) fail('bad-targets', 'upgrades attach to a friendly unit')
    validateTargets(state, seat, def.targets ?? [], targets.slice(1), def.name)
    payCost(state, seat, def.cost)
    side.hand.splice(idx, 1)
    // upgrade pressure (v1.2): beyond-first upgrade → opponent gains influence
    if (carrier.upgrades.length >= 1 && state.rules.upgradePressureInfluence > 0) {
      runOps({ state, controller: other(seat), actorSeat: seat }, [{ op: 'influence', n: state.rules.upgradePressureInfluence }])
      log(state, other(seat), `upgrade pressure: ${state.sides[other(seat)].name} gains ${state.rules.upgradePressureInfluence} influence`)
    }
    state.upgrades[action.card] = { id: action.card, slug: def.slug, owner: seat, attachedTo: carrier.id }
    carrier.upgrades.push(action.card)
    log(state, seat, `${side.name} attaches ${def.name} to ${defOf(state, carrier.id).name}`)
    if (def.onPlay?.length) runOps({ state, controller: seat, sourceUnit: carrier.id, targets: targets.slice(1), actorSeat: seat }, def.onPlay)
    return
  }

  validateTargets(state, seat, def.targets ?? [], targets, def.name)
  payCost(state, seat, def.cost)
  side.hand.splice(idx, 1)

  if (def.type === 'unit') {
    const zone = homeZone(seat)
    state.units[action.card] = {
      id: action.card, slug: def.slug, owner: seat, zone,
      damage: 0, exhausted: false, enteredTurn: state.turn,
      imprisoned: null, upgrades: [], mods: [], overextendedBy: 0,
    }
    log(state, seat, `${side.name} deploys ${def.name}`)
    const unit = state.units[action.card]
    if (def.onPlay?.length) runOps({ state, controller: seat, sourceUnit: unit.id, targets, actorSeat: seat }, def.onPlay)
    if (def.onEnterZone?.length && state.units[unit.id]) {
      fireTrigger({ state, targets, enteredZone: zone, actorSeat: seat }, unit, 'onEnterZone')
    }
  } else {
    // action card
    log(state, seat, `${side.name} plays ${def.name}`)
    runOps({ state, controller: seat, targets, actorSeat: seat }, def.onPlay ?? [])
    side.discard.push(action.card)
  }
}

// ─── Movement ────────────────────────────────────────────────────────────────

function moveUnit(state: GameState, unitId: string, to: ZoneId, seat: Seat) {
  const unit = state.units[unitId] ?? fail('no-unit', 'no such unit')
  if (unit.owner !== seat) fail('not-yours', 'not your unit')
  if (unit.imprisoned) fail('imprisoned', 'imprisoned units cannot move')
  if (unit.exhausted) fail('exhausted', 'exhausted units cannot move')
  if (isSick(state, unit)) fail('sick', 'this unit just arrived this turn')
  if (to === unit.zone) fail('bad-move', 'already there')
  if (!hasKw(state, unit, 'flying') && !adjacent(unit.zone, to)) fail('bad-move', 'can only move to an adjacent zone')
  unit.zone = to
  if (state.rules.moveExhausts) unit.exhausted = true
  log(state, seat, `${defOf(state, unitId).name} advances to ${zoneName(state, to)}`)
  fireTrigger({ state, enteredZone: to, actorSeat: seat }, unit, 'onEnterZone')
}

const zoneName = (state: GameState, z: ZoneId) =>
  z === 1 ? 'the Neutral zone' : `${state.sides[z === 0 ? 0 : 1].name}'s Home`

// ─── Combat ──────────────────────────────────────────────────────────────────

function guardsFor(state: GameState, defender: Seat, zone: ZoneId): UnitInstance[] {
  return unitsInZone(state, zone, defender).filter(u => !u.imprisoned && hasKw(state, u, 'guard'))
}

function attack(state: GameState, attackerId: string, target: TargetRef, seat: Seat, overextend: boolean) {
  const attacker = state.units[attackerId] ?? fail('no-unit', 'no such attacker')
  if (attacker.owner !== seat) fail('not-yours', 'not your unit')
  if (attacker.imprisoned) fail('imprisoned', 'imprisoned units cannot attack')
  if (attacker.exhausted) fail('exhausted', 'exhausted units cannot attack')
  if (isSick(state, attacker)) fail('sick', 'this unit just arrived this turn')
  if (hasKw(state, attacker, 'cantAttack')) fail('cant-attack', 'this unit cannot attack')

  // decision 35: overextending is an optional gamble — +N power now, N self-damage at end of turn
  const oe = kwOf(state, attacker, 'overextend')
  if (overextend && typeof oe !== 'number') fail('cant-overextend', 'this unit has no Overextend value')
  if (overextend && typeof oe === 'number') {
    attacker.overextendedBy += oe
    log(state, seat, `${defOf(state, attackerId).name} overextends (+${oe} power — it will suffer ${oe} at end of turn)`)
  }

  const ranged = hasKw(state, attacker, 'ranged')
  const reach = hasKw(state, attacker, 'reach')

  if (target.kind === 'base') {
    if (target.seat === seat) fail('bad-target', 'cannot attack your own base')
    if (ranged) fail('bad-target', 'ranged units cannot target bases')
    if (attacker.zone !== homeZone(target.seat)) fail('bad-target', "you must stand in the enemy's home zone to strike their base")
    if (guardsFor(state, target.seat, attacker.zone).length) fail('guard', 'a Guard unit protects the base')
    attacker.exhausted = true
    log(state, seat, `${defOf(state, attackerId).name} assaults ${state.sides[target.seat].name}'s base`)
    fireTrigger({ state, attackTarget: target, actorSeat: seat }, attacker, 'onAttack')
    fireTrigger({ state, attackTarget: target, actorSeat: seat }, attacker, 'onAttackBase')
    if (!state.units[attackerId]) return // trigger may have killed the attacker
    const power = attackPower(state, attacker, overextend)
    damageBase(state, target.seat, power, defOf(state, attackerId).name)
    return
  }

  if (target.kind !== 'unit') fail('bad-target', 'attack a unit or a base')
  const defender = state.units[target.id] ?? fail('no-unit', 'no such defender')
  if (defender.owner === seat) fail('bad-target', 'cannot attack your own unit')

  const sameZone = defender.zone === attacker.zone
  const adjacentZone = adjacent(defender.zone, attacker.zone)
  if (!sameZone && !((ranged || reach) && adjacentZone)) fail('bad-zone', ranged || reach ? 'target is out of range' : 'combat happens within one zone')

  const guards = guardsFor(state, defender.owner, defender.zone)
  if (guards.length && !guards.some(g => g.id === defender.id)) fail('guard', 'a Guard unit must be attacked first')

  attacker.exhausted = true
  log(state, seat, `${defOf(state, attackerId).name} attacks ${defOf(state, defender.id).name}`)
  fireTrigger({ state, attackTarget: target, actorSeat: seat }, attacker, 'onAttack')
  fireTrigger({ state, attackTarget: { kind: 'unit', id: attackerId }, actorSeat: seat }, defender, 'onDefend')
  if (!state.units[attackerId] || !state.units[target.id]) return // triggers resolved the fight already

  const atkPower = attackPower(state, attacker, overextend)
  const defPower = defender.imprisoned ? 0 : effPower(state, defender)
  const counter = sameZone || !ranged // cross-zone ranged shots draw no counter-damage

  const defHpBefore = Math.max(0, (defOf(state, defender.id).health ?? 0) + 0) // base health guard for logs
  void defHpBefore
  const dealt = Math.max(0, atkPower - effArmor(state, defender))
  const taken = counter ? Math.max(0, defPower - effArmor(state, attacker)) : 0
  const defRemaining = remainingHealth(state, defender)
  defender.damage += dealt
  if (taken > 0) attacker.damage += taken
  log(state, seat, combatLine(state, attackerId, defender.id, dealt, taken))

  // Breakthrough: excess beyond lethal, capped at N, hits the defender's controller
  const bt = kwOf(state, attacker, 'breakthrough')
  if (bt !== false && dealt > defRemaining) {
    const excess = Math.min(typeof bt === 'number' ? bt : dealt - defRemaining, dealt - defRemaining)
    if (excess > 0) damageBase(state, defender.owner, excess, `${defOf(state, attackerId).name} (breakthrough)`)
  }

  const died = defender.damage >= remainingHealthBase(state, defender)
  if (died) fireTrigger({ state, attackTarget: target, actorSeat: seat }, attacker, 'onKill')
}

/** Attacker's power; the Overextend bonus applies only when the gamble is taken (decision 35). */
function attackPower(state: GameState, attacker: UnitInstance, overextend: boolean): number {
  let p = effPower(state, attacker)
  const oe = kwOf(state, attacker, 'overextend')
  if (overextend && typeof oe === 'number') p += oe
  return p
}

const remainingHealth = (state: GameState, u: UnitInstance) => {
  const total = (defOf(state, u.id).health ?? 0) + u.mods.reduce((s, m) => s + (m.h ?? 0), 0)
  return Math.max(0, total - u.damage)
}
const remainingHealthBase = remainingHealth

function combatLine(state: GameState, a: string, d: string, dealt: number, taken: number): string {
  const an = defOf(state, a).name
  const dn = defOf(state, d).name
  return taken > 0
    ? `${an} and ${dn} clash — ${dealt} dealt, ${taken} taken`
    : `${an} strikes ${dn} for ${dealt}`
}
