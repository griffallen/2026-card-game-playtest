import type {
  GameAction, GameState, LogLine, Seat, TargetRef, TargetSpec, UnitInstance, ZoneId,
} from './types.ts'
import { EngineError, adjacent, homeZone } from './types.ts'
import { shuffle } from './rng.ts'
import {
  addInfluence, defOf, effArmor, effHealth, effPower, hasKw, idNum, isSick, kwOf, log, other, pipGateSatisfied, unitsInZone,
} from './helpers.ts'
import { damageBase, damageUnit, destroyUnit, fireTrigger, runOps, stateBasedCleanup } from './effects.ts'
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
  } else if (state.phase === 'block') {
    applyBlockPhase(state, action, actorSeat)
  } else {
    applyLoopPhase(state, action, actorSeat)
  }

  // Final Onslaught (PR #38): fresh → waiting on the creating action; the seat's next action
  // spends it; once no attack pends, the doomed unit and its attack's victims all die.
  if (state.doom && state.winner === null) {
    if (state.doom.stage === 'fresh') state.doom.stage = 'waiting'
    else if (state.doom.stage === 'waiting' && actorSeat === state.doom.seat) state.doom.stage = 'spent'
    if (state.doom.stage === 'spent' && !state.pendingAttack) {
      const doomed = state.units[state.doom.unit]
      const victims = state.doomVictims.filter(id => state.units[id])
      if (doomed) {
        log(state, state.doom.seat, `${defOf(state, doomed.id).name}'s onslaught ends — it falls${victims.length ? ', taking the wounded with it' : ''}`)
        destroyUnit(state, doomed, 'its final onslaught')
      }
      for (const id of victims) {
        const v = state.units[id]
        if (v) destroyUnit(state, v, 'the final onslaught')
      }
      state.doom = null
      state.doomVictims = []
    }
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
    case 'activate': activateAbility(state, action, seat); break
    case 'releaseCaptive': fail('no-release', 'captives are freed only when their captor falls (decision 92)')
    case 'attachOrphan': attachOrphan(state, action, seat); break
    case 'move': moveUnit(state, action.unit, action.to, seat); break
    case 'attack': attackDeclare(state, action, seat); return // declare→intercept/resolve advances the window itself
    default: fail('bad-phase', `${(action as GameAction).type} is not a loop action`)
  }
  advanceWindow(state, seat)
}

// ─── v3 keyword actions ──────────────────────────────────────────────────────

/** Exhaust-activated abilities: Sneak (decision 60) and v3 Ranged volleys (decision 80). */
function activateAbility(state: GameState, action: Extract<GameAction, { type: 'activate' }>, seat: Seat) {
  const unit = state.units[action.unit] ?? fail('no-unit', 'no such unit')
  if (unit.owner !== seat) fail('not-yours', 'not your unit')
  if (unit.exhausted) fail('exhausted', 'exhausted units cannot use abilities')
  if (unit.imprisoned) fail('imprisoned', 'imprisoned units cannot use abilities')
  const def = defOf(state, unit.id)
  const sneak = def.sneak
  if (!(def.kw ?? []).some(k => k.k === 'sneak') || !sneak) {
    // v3 Ranged (decision 80): exhaust to volley N at one enemy unit, any zone
    const n = kwOf(state, unit, 'ranged')
    if (state.rules.combatModel === 'blockerPairing' && typeof n === 'number') {
      const ref = (action.targets ?? [])[0]
      if (!ref || ref.kind !== 'unit') fail('bad-targets', 'a volley needs one enemy unit')
      const t = state.units[ref.id] ?? fail('bad-targets', 'no such unit')
      if (t.owner === seat) fail('bad-targets', 'volleys strike the enemy')
      if (!t.exhausted && hasKw(state, t, 'hidden')) fail('bad-targets', `${defOf(state, t.id).name} is hidden`)
      unit.exhausted = true
      log(state, seat, `${def.name} volleys ${defOf(state, t.id).name}`)
      damageUnit(state, t, n, def.name)
      // decision 74: a kill is a kill — a lethal volley credits the archer
      if (state.units[t.id] && t.damage >= effHealth(state, t)) {
        fireTrigger({ state, attackTarget: { kind: 'unit', id: t.id }, actorSeat: seat }, unit, 'onKill')
      }
      return
    }
    fail('no-sneak', `${def.name} has no ability to use`)
  }
  const targets = action.targets ?? []
  validateTargets(state, seat, sneak.targets ?? [], targets, `${def.name} (Sneak)`)
  for (const ref of targets) {
    if (ref.kind === 'unit') {
      const t = state.units[ref.id] ?? fail('bad-targets', 'no such unit')
      if (t.zone !== unit.zone) fail('bad-zone', 'Sneak strikes within its own zone')
    }
    if (ref.kind === 'base' && unit.zone !== homeZone(other(seat))) fail('bad-zone', "Sneak reaches the enemy base only from their home zone")
  }
  unit.exhausted = true
  log(state, seat, `${def.name} sneaks`)
  runOps({ state, controller: seat, sourceUnit: unit.id, targets, actorSeat: seat }, sneak.ops)
}

/** v3 (decision 67): salvage an orphaned upgrade onto your unit in its zone — full cost, pips included. */
function attachOrphan(state: GameState, action: Extract<GameAction, { type: 'attachOrphan' }>, seat: Seat) {
  const up = state.upgrades[action.upgrade] ?? fail('no-upgrade', 'no such upgrade')
  if (up.attachedTo !== null || up.orphanedIn === undefined) fail('not-orphaned', 'that upgrade is not lying free')
  const unit = state.units[action.unit] ?? fail('no-unit', 'no such unit')
  if (unit.owner !== seat) fail('not-yours', 'attach to your own unit')
  if (unit.zone !== up.orphanedIn) fail('bad-zone', 'salvage happens where it fell')
  const def = defOf(state, up.id)
  if (!pipGateSatisfied(state, seat, def)) fail('pip-gate', `${def.name} needs banked color sources for its pips (decision 69)`)
  payCost(state, seat, def.cost)
  // upgrade pressure applies to salvage too — the greed tax doesn't care how the second upgrade arrived (#23 sweep)
  if (unit.upgrades.length >= 1 && state.rules.upgradePressureInfluence > 0) {
    runOps({ state, controller: other(seat), actorSeat: seat }, [{ op: 'influence', n: state.rules.upgradePressureInfluence }])
    log(state, other(seat), `upgrade pressure: ${state.sides[other(seat)].name} gains ${state.rules.upgradePressureInfluence} influence`)
  }
  up.owner = seat
  up.attachedTo = unit.id
  delete up.orphanedIn
  unit.upgrades.push(up.id)
  log(state, seat, `${state.sides[seat].name} salvages ${def.name} onto ${defOf(state, unit.id).name}`)
}

// ─── Playing cards ───────────────────────────────────────────────────────────

function payCost(state: GameState, seat: Seat, cost: number) {
  const ready = state.sides[seat].resources.filter(r => !r.exhausted)
  if (ready.length < cost) fail('cant-pay', `costs ${cost}, only ${ready.length} ready resources`)
  for (let i = 0; i < cost; i++) ready[i].exhausted = true
}

function validateTargets(state: GameState, seat: Seat, specs: TargetSpec[], targets: TargetRef[], cardName: string) {
  const maxExpected = specs.reduce((s, spec) => s + (spec.count ?? 1), 0)
  const minExpected = specs.reduce((s, spec) => s + (spec.upTo ? 1 : (spec.count ?? 1)), 0)
  if (targets.length < minExpected || targets.length > maxExpected)
    fail('bad-targets', `${cardName} needs ${minExpected === maxExpected ? maxExpected : `${minExpected}-${maxExpected}`} target(s)`)
  // v3 sameZone (Volcanic Slam): every unit target of a sameZone spec shares one zone
  for (const spec of specs) {
    if (!spec.sameZone) continue
    const zones = new Set(targets.filter(t => t.kind === 'unit').map(t => state.units[t.id]?.zone))
    if (zones.size > 1) fail('bad-targets', `${cardName}'s targets must share a zone`)
  }
  // decision 72 (adjacentToFirst): a constrained zone target must hug the first chosen unit's zone
  if (specs.some(s => s.adjacentToFirst)) {
    const first = targets.find(t => t.kind === 'unit')
    const u = first && first.kind === 'unit' ? state.units[first.id] : undefined
    for (const ref of targets) {
      if (ref.kind === 'zone' && (!u || !adjacent(ref.zone, u.zone)))
        fail('bad-targets', `${cardName} reaches only a zone adjacent to its unit`)
    }
  }
  let i = 0
  const seen = new Set<string>()
  for (const spec of specs) {
    for (let c = 0; c < (spec.count ?? 1); c++, i++) {
      const ref = targets[i]
      if (!ref && spec.upTo) continue   // v3: unfilled upTo slots are fine
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
      if (spec.damagedOrMaxHealth !== undefined && u.damage <= 0 && effHealth(state, u) > spec.damagedOrMaxHealth)
        fail('bad-targets', `target must be damaged or have ${spec.damagedOrMaxHealth} or less health`)
      if (spec.withKw && !hasKw(state, u, spec.withKw)) fail('bad-targets', `target must have ${spec.withKw}`)
      if (spec.mustBeDamaged && u.damage <= 0) fail('bad-targets', 'target must be damaged')
      // Chain of Law: enemy units with `untargetable` can't be chosen by enemy card effects
      if (u.owner !== seat && hasKw(state, u, 'untargetable')) fail('bad-targets', `${defOf(state, u.id).name} cannot be targeted`)
      // v3 Hidden (decision 59): while READY it can't be targeted by enemy actions
      if (u.owner !== seat && !u.exhausted && hasKw(state, u, 'hidden')) fail('bad-targets', `${defOf(state, u.id).name} is hidden`)
    }
  }
}

function playCard(state: GameState, action: Extract<GameAction, { type: 'play' }>, seat: Seat) {
  const side = state.sides[seat]
  const idx = side.hand.indexOf(action.card)
  if (idx < 0) fail('not-in-hand', 'card is not in your hand')
  const def = defOf(state, action.card)
  if (!pipGateSatisfied(state, seat, def))
    fail('pip-gate', `${def.name} needs banked color sources for its pips (decision 69)`)
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

  const mode = def.modes ? (
    action.mode === undefined || !def.modes[action.mode]
      ? fail('bad-mode', `${def.name} is modal — declare a mode (0-${def.modes.length - 1})`)
      : def.modes[action.mode]
  ) : undefined
  validateTargets(state, seat, (mode ? mode.targets : def.targets) ?? [], targets, def.name)
  // issue #45: an X card's cost is declared at cast — any number of ready resources
  if (def.xCost && (action.x === undefined || !Number.isInteger(action.x) || action.x < 0))
    fail('bad-x', `${def.name} costs X — declare how many resources to pay`)
  payCost(state, seat, def.xCost ? action.x! : def.cost)
  side.hand.splice(idx, 1)

  if (def.type === 'unit') {
    // v3 Infiltrate: deploy-time zone choice; everyone else deploys home
    let zone = homeZone(seat)
    if (action.zone !== undefined) {
      if (!(def.kw ?? []).some(k => k.k === 'infiltrate')) fail('bad-zone', `${def.name} lacks Infiltrate — it deploys to your Home`)
      if (![0, 1, 2].includes(action.zone)) fail('bad-zone', 'no such zone')
      zone = action.zone
    }
    state.units[action.card] = {
      id: action.card, slug: def.slug, owner: seat, zone,
      damage: 0, exhausted: false, enteredRound: state.round, movedThisRound: false,
      shielded: (def.kw ?? []).some(k => k.k === 'shielded'),
      imprisoned: null, upgrades: [], mods: [], overextendedBy: 0,
    }
    log(state, seat, `${side.name} deploys ${def.name}`)
    const unit = state.units[action.card]
    if (def.onPlay?.length) runOps({ state, controller: seat, sourceUnit: unit.id, targets, actorSeat: seat, x: action.x }, def.onPlay)
    if (def.onEnterZone?.length && state.units[unit.id]) {
      fireTrigger({ state, targets, enteredZone: zone, actorSeat: seat }, unit, 'onEnterZone')
    }
  } else {
    // action card
    log(state, seat, `${side.name} plays ${def.name}${mode ? ` — ${mode.label}` : ''}${def.xCost ? ` (X=${action.x})` : ''}`)
    runOps({ state, controller: seat, targets, actorSeat: seat, x: action.x }, mode ? mode.ops : (def.onPlay ?? []))
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
  if (oeIds.length && state.rules.combatModel !== 'intercept')
    fail('cant-overextend', 'overextend retired with the intercept window — blocker combat has no gamble')
  for (const id of oeIds) {
    if (!ids.includes(id)) fail('bad-attack', 'overextend lists a non-attacker')
    if (typeof kwOf(state, state.units[id], 'overextend') !== 'number') fail('cant-overextend', `${defOf(state, id).name} has no Overextend value`)
  }

  // decision 80: the sniper-shot attack semantics survive only in classic v2.3 — v3 Ranged
  // attacks are ordinary (the reach moved into the volley ability)
  const legacyRanged = state.rules.combatModel === 'intercept'
  const allRangedOrReach = legacyRanged && units.every(u => hasKw(state, u, 'ranged') || hasKw(state, u, 'reach'))
  if (action.target.kind === 'base') {
    if (action.target.seat === seat) fail('bad-target', 'cannot attack your own base')
    if (legacyRanged && units.some(u => hasKw(state, u, 'ranged'))) fail('bad-target', 'ranged units cannot target bases')
    if (zone !== homeZone(action.target.seat)) fail('bad-target', "you must stand in the enemy's home zone to strike their base")
  } else if (action.target.kind === 'unit') {
    const defender = state.units[action.target.id] ?? fail('no-unit', 'no such defender')
    if (defender.owner === seat) fail('bad-target', 'cannot attack your own unit')
    // v3 Hidden (decision 59): a READY hidden unit can't be declared as the attack target
    if (!defender.exhausted && hasKw(state, defender, 'hidden')) fail('bad-target', `${defOf(state, defender.id).name} is hidden`)
    const sameZone = defender.zone === zone
    if (!sameZone && !(allRangedOrReach && adjacent(defender.zone, zone)))
      fail('bad-zone', allRangedOrReach ? 'target is out of range' : 'combat happens within one zone')
  } else fail('bad-target', 'attack a unit or a base')

  // PR #46 (splashReap, decision 93): attackers with a chosen-splash trigger declare their
  // victims WITH the attack (decision 24: no mid-resolution input). Any unit in the combat
  // zone — even your own (designer: "I like the openness") — except the declared target.
  const needsSplash = (uid: string) => (defOf(state, uid).onAttack ?? []).some(o => o.op === 'splashReap')
  const combatZoneForSplash = action.target.kind === 'unit' ? state.units[action.target.id]!.zone : null
  const splashChoice: Record<string, string> = {}
  for (const e of action.splash ?? []) {
    if (!ids.includes(e.by) || !needsSplash(e.by)) fail('bad-splash', 'that attacker declares no skewer')
    if (splashChoice[e.by]) fail('bad-splash', 'one victim per skewer')
    if (combatZoneForSplash === null) fail('bad-splash', 'the skewer only fires when attacking a unit')
    const v = state.units[e.unit] ?? fail('bad-splash', 'no such skewer victim')
    if (v.zone !== combatZoneForSplash) fail('bad-splash', 'the skewer reaches only the combat zone')
    if (action.target.kind === 'unit' && v.id === action.target.id) fail('bad-splash', 'the skewer wants a second victim — it ALSO deals damage')
    if (v.id === e.by) fail('bad-splash', 'the skewer cannot turn on its own wielder')
    if (v.imprisoned) fail('bad-splash', 'imprisoned units cannot be skewered')
    if (v.owner !== seat && !v.exhausted && hasKw(state, v, 'hidden')) fail('bad-splash', 'a ready hidden unit cannot be chosen (decision 76)')
    splashChoice[e.by] = e.unit
  }
  if (combatZoneForSplash !== null) {
    for (const u of units) {
      if (!needsSplash(u.id) || splashChoice[u.id]) continue
      const cands = unitsInZone(state, combatZoneForSplash).filter(x =>
        x.id !== (action.target as { id: string }).id && x.id !== u.id && !x.imprisoned
        && !(x.owner !== seat && !x.exhausted && hasKw(state, x, 'hidden')))
      if (cands.length) fail('missing-splash', `${defOf(state, u.id).name} must declare its skewer victim with the attack`)
    }
  }

  // Unchained Rage (PR #39): each attacking unit cedes influence while the rage lasts
  for (const tax of state.attackTaxes) {
    if (tax.seat !== seat) continue
    addInfluence(state, seat, -tax.n * units.length)
    log(state, seat, `the rage collects: ${state.sides[seat].name} cedes ${tax.n * units.length} influence for ${units.length} attacker${units.length > 1 ? 's' : ''}`)
  }

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
    fireTrigger({ state, attackTarget: action.target, actorSeat: seat, splashChoice }, u, 'onAttack')
  }

  state.pendingAttack = { seat, attackers: ids.filter(id => state.units[id]), target: action.target, overextend: oeIds }
  if (state.rules.combatModel === 'blockerPairing') {
    const combatZone = action.target.kind === 'unit' ? state.units[action.target.id]!.zone : homeZone(action.target.seat)
    const defSeat = other(seat)
    const crossZone = combatZone !== zone   // unreachable under v3 since decision 80 (no cross-zone attacks); v2.3-only path
    let candidates = unitsInZone(state, combatZone, defSeat).filter(u => !u.imprisoned && !u.exhausted)
    // issue #50 (duel law): a lone attacker opens a window only for Guards —
    // unless it strikes the Home (decision 100: base defense is open to all)
    if (state.rules.singleAttackerDuels && action.target.kind === 'unit' && state.pendingAttack.attackers.length === 1) {
      candidates = candidates.filter(u => hasKw(state, u, 'guard'))
    }
    // the declared target may block its own attacker — self-defense costs the exhaust like any block
    if (!crossZone && candidates.length) {
      state.phase = 'block'
      state.actorSeat = defSeat
      log(state, defSeat, `${state.sides[defSeat].name} may assign blockers`)
      return
    }
    resolveBlockedAttack(state, [])
    return
  }
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

/** v3 (spec §1.3): the defender answers the block window by pairing blockers onto attackers. */
function applyBlockPhase(state: GameState, action: GameAction, seat: Seat) {
  const pa = state.pendingAttack ?? fail('bad-phase', 'no attack to answer')
  if (seat !== other(pa.seat)) fail('not-your-window', 'not your block window')
  if (action.type !== 'block') fail('bad-phase', 'assign blockers with a block action (empty pairs lets it through)')
  const combatZone = pa.target.kind === 'unit' ? state.units[pa.target.id]?.zone
    : pa.target.kind === 'base' ? homeZone(pa.target.seat) : undefined  // attacks only ever target unit|base
  // issue #50 (duel law): one attacker → at most one blocker, and only a Guard may step in.
  // decision 100: unit targets only — the Home is everyone's to defend
  if (state.rules.singleAttackerDuels && pa.target.kind === 'unit'
    && pa.attackers.filter(a => state.units[a]).length === 1 && action.pairs.length) {
    if (action.pairs.length > 1) fail('bad-block', 'a lone attacker is answered by one guard at most')
    const g = state.units[action.pairs[0].blocker]
    if (!g || !hasKw(state, g, 'guard')) fail('bad-block', 'only a Guard may step in front of a duel (issue #50)')
  }
  const seen = new Set<string>()
  for (const { blocker, onto } of action.pairs) {
    const b = state.units[blocker] ?? fail('no-unit', 'no such blocker')
    if (b.owner !== seat) fail('not-yours', 'not your unit')
    if (b.exhausted) fail('exhausted', 'exhausted units cannot block')
    if (b.imprisoned) fail('imprisoned', 'imprisoned units cannot block')
    if (b.zone !== combatZone) fail('bad-zone', 'blockers must stand in the combat zone')
    if (seen.has(blocker)) fail('bad-block', 'a unit blocks at most one attacker')
    seen.add(blocker)
    if (!pa.attackers.includes(onto)) fail('bad-block', 'that is not an attacker in this combat')
  }
  for (const { blocker } of action.pairs) {
    const b = state.units[blocker]!
    if (state.rules.blockingExhausts && !hasKw(state, b, 'guard')) b.exhausted = true
    log(state, seat, `${defOf(state, b.id).name} blocks${hasKw(state, b, 'guard') ? ' (guard — stays ready)' : ''}`)
  }
  resolveBlockedAttack(state, action.pairs)
}

/** v3 (spec §1.3): paired simultaneous resolution — pour-order gang splits, breakthrough spill to the
 *  ORIGINAL declared target, unblocked attackers hit the target; blockers strike back, and under
 *  retaliation 'always' (decision 84) so does the declared target, exhausted or not. */
function resolveBlockedAttack(state: GameState, pairs: { blocker: string; onto: string }[]) {
  const pa = state.pendingAttack!
  state.pendingAttack = null
  state.phase = 'loop'
  const seat = pa.seat
  const byAttacker = new Map<string, string[]>()
  for (const p of pairs) byAttacker.set(p.onto, [...(byAttacker.get(p.onto) ?? []), p.blocker])
  const attackers = pa.attackers.map(id => state.units[id]).filter(Boolean) as UnitInstance[]

  // snapshot the plan first — everything resolves simultaneously
  const plans = attackers.map(a => {
    const blockers = (byAttacker.get(a.id) ?? []).map(id => state.units[id]).filter(Boolean) as UnitInstance[]
    return { a, blockers, aPower: effPower(state, a), counter: blockers.reduce((s, b) => s + effPower(state, b), 0), spilled: false }
  })
  for (const p of plans) for (const b of p.blockers) {
    fireTrigger({ state, attackTarget: { kind: 'unit', id: p.a.id }, actorSeat: seat }, b, 'onDefend')
  }

  const unitHits: [UnitInstance, number, string][] = []
  let targetSpill = 0
  let unblockedTotal = 0
  const unblockedNames: string[] = []
  // Final Onslaught (PR #38): if the doomed unit is attacking, remember who its blows reach —
  // "any unit damaged by this unit's attack" dies with it. Candidates now, wounds verified below.
  const doomId = state.doom?.unit
  const doomCandidates = new Set<string>()
  let doomToTarget = 0
  // #25 experiment: under 'always', the declared target strikes every unblocked attacker at its
  // full snapshot power, exhausted or not; under 'ready', only while un-exhausted (the timing game
  // survives). Cross-zone ranged never reaches this path — structural exemption.
  const preTarget = pa.target.kind === 'unit' ? state.units[pa.target.id] : undefined
  const retaliates = state.rules.retaliation === 'always'
    || (state.rules.retaliation === 'ready' && !!preTarget && !preTarget.exhausted)
  const retaliatePower = retaliates && preTarget ? effPower(state, preTarget) : 0
  for (const p of plans) {
    if (!p.blockers.length) {
      unblockedTotal += p.aPower
      unblockedNames.push(defOf(state, p.a.id).name)
      if (p.a.id === doomId) doomToTarget += p.aPower
      if (retaliatePower > 0 && preTarget && p.a.id !== preTarget.id)
        unitHits.push([p.a, retaliatePower, defOf(state, preTarget.id).name])
      continue
    }
    // pour the attacker's damage over its blockers in pair order (the defender chose the order)
    let dmg = p.aPower
    for (const b of p.blockers) {
      if (dmg <= 0) break
      const gross = Math.max(0, effHealth(state, b) - b.damage) + effArmor(state, b)  // what it takes to fell it through armor
      const chunk = Math.min(dmg, gross)
      if (chunk > 0) unitHits.push([b, chunk, defOf(state, p.a.id).name])
      if (chunk > 0 && p.a.id === doomId) doomCandidates.add(b.id)
      dmg -= chunk
    }
    if (dmg > 0 && hasKw(state, p.a, 'breakthrough')) {
      targetSpill += dmg; p.spilled = true   // v3: no N — all excess pushes through
      if (p.a.id === doomId) doomToTarget += dmg
    }
    // issue #58 (Griff): name the counter's source — twin "from the blockers" lines read as
    // one combined pool hitting every attacker, when each pair resolves in isolation
    if (p.counter > 0) unitHits.push([p.a, p.counter, p.blockers.map(b => defOf(state, b.id).name).join(' + ')])
  }

  const targetUnit = pa.target.kind === 'unit' ? state.units[pa.target.id] : undefined
  // decision 85: being the declared target IS defending — the trigger fires whether the attack
  // got through or its blockers ate everything ("no matter if it's targeted or if it defends").
  // decision 86: but only ONCE — a self-blocking target already fired as a blocker.
  if (targetUnit && !pairs.some(p => p.blocker === targetUnit.id)) {
    fireTrigger({ state, attackTarget: { kind: 'unit', id: attackers[0]?.id ?? '' }, actorSeat: seat }, targetUnit, 'onDefend')
  }

  if (targetUnit && doomToTarget > 0) doomCandidates.add(targetUnit.id)
  // snapshot before the blows land — armor and shields decide who was truly wounded
  const doomPreDamage = new Map([...doomCandidates].map(id => [id, state.units[id]?.damage ?? 0]))

  // apply everything at once
  for (const [u, n, src] of unitHits) if (state.units[u.id]) damageUnit(state, u, n, src)
  // decision 74: "a kill is a kill" — deaths haven't cleaned up yet, so lethality is the test
  const felled = (id: string) => { const u = state.units[id]; return !!u && u.damage >= effHealth(state, u) }
  // decision 87: the declaration counts — an unblocked base attack fires "attacks a base"
  // even if every point of damage is prevented (or the attacker's power is zero)
  if (pa.target.kind === 'base') {
    for (const p of plans) if (!p.blockers.length && state.units[p.a.id]) {
      fireTrigger({ state, attackTarget: pa.target, actorSeat: seat }, p.a, 'onAttackBase')
    }
  }
  const toTarget = unblockedTotal + targetSpill
  if (toTarget > 0) {
    if (pa.target.kind === 'base') {
      damageBase(state, pa.target.seat, toTarget, unblockedNames.join(', ') || 'breakthrough')
    } else if (targetUnit && state.units[targetUnit.id]) {
      damageUnit(state, targetUnit, toTarget, unblockedNames.join(', ') || 'breakthrough')
      if (felled(targetUnit.id)) {
        // credit only attackers whose damage actually reached the target — idle blocked
        // attackers stop collecting on their allies' kills (decision 74)
        for (const p of plans) if ((!p.blockers.length || p.spilled) && state.units[p.a.id]) {
          fireTrigger({ state, attackTarget: pa.target, actorSeat: seat }, p.a, 'onKill')
        }
      }
    }
  }
  // decision 74: attackers credit the blockers they fell; blockers credit the attacker they fell;
  // under the #25 retaliation experiment, the target credits attackers its counter-blow kills.
  for (const p of plans) {
    for (const b of p.blockers) {
      if (felled(b.id) && state.units[p.a.id]) {
        fireTrigger({ state, attackTarget: { kind: 'unit', id: b.id }, actorSeat: seat }, p.a, 'onKill')
      }
    }
    if (felled(p.a.id)) {
      for (const b of p.blockers) if (state.units[b.id]) {
        fireTrigger({ state, attackTarget: { kind: 'unit', id: p.a.id }, actorSeat: seat }, b, 'onKill')
      }
      if (!p.blockers.length && retaliatePower > 0 && preTarget && state.units[preTarget.id]) {
        fireTrigger({ state, attackTarget: { kind: 'unit', id: p.a.id }, actorSeat: seat }, preTarget, 'onKill')
      }
    }
  }
  // Final Onslaught: a candidate whose damage actually rose was wounded by the doomed unit
  for (const [id, before] of doomPreDamage) {
    const u = state.units[id]
    if (u && u.damage > before) state.doomVictims.push(id)
  }

  stateBasedCleanup(state, seat)
  if (state.winner !== null) return
  advanceWindow(state, seat)
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
