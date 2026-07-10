import type {
  GameAction, GameState, LogLine, Seat, TargetRef, TargetSpec, UnitInstance, ZoneId,
} from './types.ts'
import { EngineError, adjacent, homeZone } from './types.ts'
import { shuffle } from './rng.ts'
import {
  defOf, effArmor, effHealth, effPower, hasKw, idNum, isSick, kwOf, log, other, unitsInZone,
} from './helpers.ts'
import { damageBase, damageUnit, fireTrigger, runOps, stateBasedCleanup } from './effects.ts'
import { startRound, endRound, finishBankStep } from './round.ts'

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
  } else if (state.phase === 'bank') {
    applyBankPhase(state, action, actorSeat)
  } else if (state.phase === 'intercept') {
    applyInterceptPhase(state, action, actorSeat)
  } else {
    applyLoopPhase(state, action, actorSeat)
  }

  stateBasedCleanup(state, actorSeat)
  return { state, events: state.log.slice(logStart) }
}

/** Setup phase: mulligan as often as you dare (decision 32), then choose your banks (decision 31). */
function applySetupPhase(state: GameState, action: GameAction, seat: Seat) {
  if (action.type === 'mulligan') {
    const side = state.sides[seat]
    const london = state.rules.mulliganStyle === 'london'
    // both styles keep the same effective hand after payback, so the floor formula is shared
    const keptCount = state.rules.startingHandSize - (state.mulligans[seat] + 1) * state.rules.mulliganPenalty
    if (keptCount < state.rules.startingResources) {
      fail('mulligan-floor', `a smaller hand couldn't bank ${state.rules.startingResources} resources`)
    }
    const drawCount = london ? state.rules.startingHandSize : keptCount
    side.deck.push(...side.hand)
    side.hand = []
    ;[side.deck, state.rngState] = shuffle(side.deck, state.rngState)
    for (let i = 0; i < drawCount; i++) {
      const id = side.deck.pop()
      if (id) side.hand.push(id)
    }
    state.mulligans[seat] += 1
    log(state, seat, london
      ? `${side.name} mulligans (will owe ${state.mulligans[seat] * state.rules.mulliganPenalty} to the deck bottom)`
      : `${side.name} mulligans to ${drawCount} cards`)
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
  // london payback (decision 58): bottom one card per mulligan taken, chosen with the banks
  const owed = state.rules.mulliganStyle === 'london' ? state.mulligans[seat] * state.rules.mulliganPenalty : 0
  const bottom = action.bottom ?? []
  if (bottom.length !== owed) {
    fail('bad-setup', owed
      ? `choose exactly ${owed} card${owed === 1 ? '' : 's'} for the deck bottom (one per mulligan)`
      : 'no cards are owed to the deck bottom')
  }
  if (new Set(bottom).size !== bottom.length) fail('bad-setup', 'bottomed cards must be distinct')
  for (const id of bottom) {
    if (!side.hand.includes(id)) fail('not-in-hand', 'bottomed card is not in your hand')
    if (action.cards.includes(id)) fail('bad-setup', 'a card cannot be banked and bottomed')
  }
  for (const id of action.cards) {
    side.hand.splice(side.hand.indexOf(id), 1)
    side.resources.push({ id, exhausted: false })
  }
  for (const id of bottom) {
    side.hand.splice(side.hand.indexOf(id), 1)
    side.deck.unshift(id) // draws pop from the end — index 0 is the bottom
  }
  if (bottom.length) log(state, seat, `${side.name} puts ${bottom.length} card${bottom.length === 1 ? '' : 's'} on the bottom of their deck`)
  state.setupBanked[seat] = true
  log(state, seat, `${side.name} banks ${action.cards.map(id => defOf(state, id).name).join(' and ')} as starting resources`)
  const other_ = other(seat)
  if (!state.setupBanked[other_]) {
    state.actorSeat = other_
  } else {
    startRound(state) // both banked — round 1 begins
  }
}

/** After seat S completes a non-pass action, decide the next window (spec §1.5). */
function advanceWindow(state: GameState, seat: Seat) {
  state.passStreak = 0
  if (state.pendingExtraAction === seat) {
    state.pendingExtraAction = null
    log(state, seat, `${state.sides[seat].name} seizes an extra action`)
    state.actorSeat = seat
    return
  }
  state.pendingExtraAction = null // an opponent-granted flag can't survive their window
  const opp = other(seat)
  state.actorSeat = state.outOfRound[opp] ? seat : opp
}

function applyBankPhase(state: GameState, action: GameAction, seat: Seat) {
  if (action.type === 'resource') {
    if (state.bankedThisStep >= state.rules.resourcesPerRound) fail('resource-cap', 'already banked this step')
    const side = state.sides[seat]
    const idx = side.hand.indexOf(action.card)
    if (idx < 0) fail('not-in-hand', 'card is not in your hand')
    side.hand.splice(idx, 1)
    side.resources.push({ id: action.card, exhausted: false })
    state.bankedThisStep += 1
    log(state, seat, `${side.name} banks ${defOf(state, action.card).name} as a resource (${side.resources.length})`)
  } else if (action.type !== 'skipResource') {
    fail('bad-phase', 'start step: bank a card or skip')
  }
  if (state.bankedThisStep >= state.rules.resourcesPerRound || action.type === 'skipResource') {
    finishBankStep(state)
  }
}

function applyLoopPhase(state: GameState, action: GameAction, seat: Seat) {
  switch (action.type) {
    case 'pass': {
      const opp = other(seat)
      state.passStreak += 1
      if (state.outOfRound[opp] || state.passStreak >= 2) { endRound(state, seat); return }
      state.actorSeat = opp
      return
    }
    case 'claimInitiative': {
      if (state.claimedThisRound) fail('claimed', 'initiative was already claimed this round')
      state.initiative = seat
      state.claimedThisRound = true
      state.outOfRound[seat] = true
      log(state, seat, `${state.sides[seat].name} claims the initiative`)
      const opp = other(seat)
      if (state.outOfRound[opp]) { endRound(state, seat); return }
      state.actorSeat = opp
      state.passStreak = 0
      return
    }
    case 'play': playCard(state, action, seat); break
    case 'move': moveUnit(state, action.unit, action.to, seat); break
    case 'attack': attackDeclare(state, action, seat); return // declare→intercept/resolve advances the window itself
    default: fail('bad-phase', `${(action as GameAction).type} is not a loop action`)
  }
  advanceWindow(state, seat)
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
      damage: 0, exhausted: false, enteredRound: state.round, movedThisRound: false,
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
  if (isSick(state, unit)) fail('sick', 'this unit just arrived this round')
  if (to === unit.zone) fail('bad-move', 'already there')
  if (!hasKw(state, unit, 'flying') && !adjacent(unit.zone, to)) fail('bad-move', 'can only move to an adjacent zone')
  unit.zone = to
  // decision 41: Rush waives the move-exhaust the round the unit entered play — but for its FIRST
  // move only (one free reposition), not a whole-round pass. A second move exhausts it like any unit.
  const rushFree = unit.enteredRound === state.round && !unit.movedThisRound && hasKw(state, unit, 'rush')
  if (state.rules.moveExhausts && !rushFree) unit.exhausted = true
  unit.movedThisRound = true
  log(state, seat, `${defOf(state, unitId).name} advances to ${zoneName(state, to)}`)
  fireTrigger({ state, enteredZone: to, actorSeat: seat }, unit, 'onEnterZone')
}

const zoneName = (state: GameState, z: ZoneId) =>
  z === 1 ? 'the Neutral zone' : `${state.sides[z === 0 ? 0 : 1].name}'s Home`

// ─── Combat ──────────────────────────────────────────────────────────────────

/** Ready, non-imprisoned defender units in the target's zone that could step in (never the target itself). */
export function interceptCandidates(state: GameState, pa: NonNullable<GameState['pendingAttack']>): UnitInstance[] {
  const defender = other(pa.seat)
  const zone = pa.target.kind === 'unit'
    ? state.units[pa.target.id]?.zone
    : pa.target.kind === 'base' ? homeZone(pa.target.seat) : undefined
  if (zone === undefined) return []
  return unitsInZone(state, zone, defender).filter(u =>
    !u.imprisoned && !u.exhausted && !(pa.target.kind === 'unit' && u.id === pa.target.id))
}

/** Declare a multi-unit attack (decision 42): validate the group, exhaust, fire onAttack, open the intercept window. */
function attackDeclare(state: GameState, action: Extract<GameAction, { type: 'attack' }>, seat: Seat) {
  const ids = action.attackers
  if (!ids.length) fail('bad-attack', 'declare at least one attacker')
  if (new Set(ids).size !== ids.length) fail('bad-attack', 'attackers must be distinct')
  if (state.rules.maxAttackers > 0 && ids.length > state.rules.maxAttackers)
    fail('bad-attack', `at most ${state.rules.maxAttackers} attackers`)
  const units = ids.map(id => state.units[id] ?? fail('no-unit', 'no such attacker'))
  for (const u of units) {
    if (u.owner !== seat) fail('not-yours', 'not your unit')
    if (u.imprisoned) fail('imprisoned', 'imprisoned units cannot attack')
    if (u.exhausted) fail('exhausted', 'exhausted units cannot attack')
    if (isSick(state, u)) fail('sick', 'this unit just arrived this round')
    if (hasKw(state, u, 'cantAttack')) fail('cant-attack', 'this unit cannot attack')
  }
  const zone = units[0].zone
  if (units.some(u => u.zone !== zone)) fail('bad-attack', 'attackers must share a zone')

  const oeIds = action.overextend ?? []
  for (const id of oeIds) {
    if (!ids.includes(id)) fail('bad-attack', 'overextend lists a non-attacker')
    if (typeof kwOf(state, state.units[id], 'overextend') !== 'number') fail('cant-overextend', `${defOf(state, id).name} has no Overextend value`)
  }

  const allRangedOrReach = units.every(u => hasKw(state, u, 'ranged') || hasKw(state, u, 'reach'))
  if (action.target.kind === 'base') {
    if (action.target.seat === seat) fail('bad-target', 'cannot attack your own base')
    if (units.some(u => hasKw(state, u, 'ranged'))) fail('bad-target', 'ranged units cannot target bases')
    if (zone !== homeZone(action.target.seat)) fail('bad-target', "you must stand in the enemy's home zone to strike their base")
  } else if (action.target.kind === 'unit') {
    const defender = state.units[action.target.id] ?? fail('no-unit', 'no such defender')
    if (defender.owner === seat) fail('bad-target', 'cannot attack your own unit')
    const sameZone = defender.zone === zone
    if (!sameZone && !(allRangedOrReach && adjacent(defender.zone, zone)))
      fail('bad-zone', allRangedOrReach ? 'target is out of range' : 'combat happens within one zone')
  } else fail('bad-target', 'attack a unit or a base')

  // commit: overextend bonuses, exhaust, declaration triggers
  for (const id of oeIds) {
    const oe = kwOf(state, state.units[id], 'overextend') as number
    state.units[id].overextendedBy += oe
    log(state, seat, `${defOf(state, id).name} overextends (+${oe} power — it will suffer ${oe} at end of round)`)
  }
  for (const u of units) {
    const rushFreeAtk = state.rules.rushCoversAttack && u.enteredRound === state.round && hasKw(state, u, 'rush')
    if (!rushFreeAtk) u.exhausted = true
  }
  const targetName = action.target.kind === 'base'
    ? `${state.sides[action.target.seat].name}'s base`
    : defOf(state, action.target.id).name
  log(state, seat, `${ids.map(id => defOf(state, id).name).join(', ')} attack${ids.length === 1 ? 's' : ''} ${targetName}`)
  for (const u of units) {
    if (!state.units[u.id]) continue
    fireTrigger({ state, attackTarget: action.target, actorSeat: seat }, u, 'onAttack')
  }

  state.pendingAttack = { seat, attackers: ids.filter(id => state.units[id]), target: action.target, overextend: oeIds }
  if (interceptCandidates(state, state.pendingAttack).length) {
    state.phase = 'intercept'
    state.actorSeat = other(seat)
    log(state, other(seat), `${state.sides[other(seat)].name} may intercept`)
    return
  }
  resolveAttack(state, null)
}

/** The defender answers the intercept window: redirect to a ready unit, or let it through. */
function applyInterceptPhase(state: GameState, action: GameAction, seat: Seat) {
  const pa = state.pendingAttack ?? fail('bad-phase', 'no attack to answer')
  if (seat !== other(pa.seat)) fail('not-your-window', 'not your intercept window')
  if (action.type === 'intercept') {
    const u = state.units[action.unit] ?? fail('no-unit', 'no such unit')
    if (!interceptCandidates(state, pa).some(c => c.id === u.id)) fail('bad-intercept', 'that unit cannot intercept this attack')
    if (state.rules.interceptExhausts && !hasKw(state, u, 'guard')) u.exhausted = true
    log(state, seat, `${defOf(state, u.id).name} intercepts${hasKw(state, u, 'guard') ? ' (guard — stays ready)' : ''}`)
    resolveAttack(state, u.id)
  } else if (action.type === 'declineIntercept') {
    resolveAttack(state, null)
  } else fail('bad-phase', 'answer the intercept window: intercept or declineIntercept')
}

/** Resolve the pending attack against the final target: combined power, armor once, one counter, breakthrough (spec §1.7). */
function resolveAttack(state: GameState, interceptorId: string | null) {
  const pa = state.pendingAttack!
  state.pendingAttack = null
  state.phase = 'loop'
  const seat = pa.seat
  const attackers = pa.attackers.map(id => state.units[id]).filter(Boolean) as UnitInstance[]
  const finalRef: TargetRef = interceptorId ? { kind: 'unit', id: interceptorId } : pa.target

  const power = (u: UnitInstance) => {
    let p = effPower(state, u)
    if (pa.overextend.includes(u.id)) {
      const oe = kwOf(state, u, 'overextend')
      if (typeof oe === 'number') p += oe
    }
    return p
  }

  const finalUnitId = finalRef.kind === 'unit' ? finalRef.id : null
  // onDefend fires for whoever ends up the final target (the interceptor, or the declared unit)
  if (attackers.length && finalUnitId && state.units[finalUnitId]) {
    fireTrigger({ state, attackTarget: { kind: 'unit', id: attackers[0].id }, actorSeat: seat }, state.units[finalUnitId], 'onDefend')
  }

  const alive = attackers.filter(u => state.units[u.id])
  const combined = alive.reduce((s2, u) => s2 + power(u), 0)

  if (finalRef.kind === 'base') {
    if (alive.length) {
      damageBase(state, finalRef.seat, combined, alive.map(u => defOf(state, u.id).name).join(', '))
      for (const u of alive) if (state.units[u.id]) fireTrigger({ state, attackTarget: finalRef, actorSeat: seat }, u, 'onAttackBase')
    }
  } else if (finalUnitId && state.units[finalUnitId]) {
    const defender = state.units[finalUnitId]
    const dealt = Math.max(0, combined - effArmor(state, defender)) // armor once (armorPerAttack: 'once')
    const defPower = defender.imprisoned ? 0 : effPower(state, defender)
    const counterTarget = alive.slice().sort((a, b) => power(b) - power(a) || idNum(a.id) - idNum(b.id))[0]
    const crossZone = !!counterTarget && defender.zone !== counterTarget.zone
    const noCounter = !counterTarget || (crossZone && hasKw(state, counterTarget, 'ranged'))
    const taken = noCounter ? 0 : Math.max(0, defPower - effArmor(state, counterTarget))
    const defRemaining = Math.max(0, effHealth(state, defender) - defender.damage)
    defender.damage += dealt
    if (taken > 0) counterTarget.damage += taken
    log(state, seat, taken > 0
      ? `the assault deals ${dealt}; ${defOf(state, defender.id).name} strikes ${defOf(state, counterTarget.id).name} back for ${taken}`
      : `the assault deals ${dealt} to ${defOf(state, defender.id).name}`)

    const btSum = alive.reduce((s2, u) => {
      const bt = kwOf(state, u, 'breakthrough')
      return s2 + (typeof bt === 'number' ? bt : 0)
    }, 0)
    if (btSum > 0 && dealt > defRemaining) {
      const excess = Math.min(btSum, dealt - defRemaining)
      if (excess > 0) damageBase(state, defender.owner, excess, 'breakthrough')
    }

    const died = defender.damage >= Math.max(0, effHealth(state, defender))
    if (died) for (const u of alive) if (state.units[u.id]) fireTrigger({ state, attackTarget: finalRef, actorSeat: seat }, u, 'onKill')
  }

  stateBasedCleanup(state, seat)
  if (state.winner !== null) return
  advanceWindow(state, seat)
}
