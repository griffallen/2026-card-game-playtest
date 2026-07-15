import type { GameState, Seat } from './types.ts'
import { addInfluence, condHolds, defOf, draw, hasKw, log, other, unitsOf } from './helpers.ts'
import { runOps, stateBasedCleanup } from './effects.ts'
// (draw handles decision-33 penalties internally; endRound settles decision-35 overextension)

/** One seat's automatic start-step: decay → startOfRound triggers → ready → draw (spec §1.4). */
function runStartStepAuto(state: GameState, seat: Seat) {
  // Prison decay FIRST: upkeep for prisoners already held. Running it after start-of-round
  // triggers would instantly break a prison taken this very step (imprison → decay → below
  // threshold → release), which guts every start-of-round jailer card.
  const held = unitsOf(state).filter(u => u.imprisoned?.by === seat).length
  if (held > 0 && state.rules.prisonDecayPerUnit > 0) {
    addInfluence(state, seat, -held * state.rules.prisonDecayPerUnit)
    log(state, seat, `${state.sides[seat].name} pays ${held * state.rules.prisonDecayPerUnit} influence to hold ${held} prisoner${held > 1 ? 's' : ''}`)
    stateBasedCleanup(state, seat)
  }
  if (state.winner !== null) return

  for (const u of unitsOf(state, seat)) {
    if (state.winner !== null) return
    if (u.imprisoned) continue
    const own = defOf(state, u.id).startOfRound
    if (own && condHolds(state, seat, own.cond)) {
      // #64: automatic ticks name their card, or they read as invisible magic
      runOps({ state, controller: seat, sourceUnit: u.id, actorSeat: seat, srcLabel: defOf(state, u.id).name }, own.ops)
    }
    for (const upId of u.upgrades) {
      const up = defOf(state, upId).startOfRound
      if (up && condHolds(state, seat, up.cond)) {
        runOps({ state, controller: seat, sourceUnit: u.id, actorSeat: seat, srcLabel: defOf(state, upId).name }, up.ops)
      }
    }
  }

  // PR #53 (Prison Warrant): captives taken under a warrant pay their holder's owner each round
  for (const [cid, c] of Object.entries(state.captives)) {
    const holder = state.units[c.by]
    if (!c.income || !holder || holder.owner !== seat) continue
    addInfluence(state, seat, c.income)
    log(state, seat, `the warrant on ${state.cardSet[c.unit.slug]?.name ?? cid} pays ${c.income} influence`)
  }
  stateBasedCleanup(state, seat)
  if (state.winner !== null) return

  for (const u of unitsOf(state, seat)) {
    u.exhausted = false; u.movedThisRound = false   // decision 92: holding costs nothing — the grip is broken only by death
  }
  for (const r of state.sides[seat].resources) r.exhausted = false

  const n = state.round === 1 ? state.rules.firstRoundDraw : state.rules.drawPerRound
  draw(state, seat, n)
  log(state, seat, `${state.sides[seat].name} draws ${n} card${n === 1 ? '' : 's'}`)
  stateBasedCleanup(state, seat)
}

/** Begin a round: initiative's start step runs, then pauses at their bank choice. */
export function startRound(state: GameState) {
  log(state, null, `— Round ${state.round} · ${state.sides[state.initiative].name} has the initiative —`)
  // decision 71 (v3): round 1 has no start step — opening hand + setup resources, straight to the loop
  if (state.round === 1 && !state.rules.firstRoundStartStep) {
    state.phase = 'loop'
    state.startStep = null
    state.actorSeat = state.initiative
    state.passStreak = 0
    return
  }
  runStartStepAuto(state, state.initiative)
  if (state.winner !== null) return
  state.phase = 'bank'
  state.startStep = state.initiative
  state.actorSeat = state.initiative
  state.bankedThisStep = 0
}

/** A seat finished banking: run the other start step, or open the action loop. */
export function finishBankStep(state: GameState) {
  const seat = state.startStep
  if (seat === null) return
  if (seat === state.initiative) {
    const next = other(seat)
    runStartStepAuto(state, next)
    if (state.winner !== null) return
    state.startStep = next
    state.actorSeat = next
    state.bankedThisStep = 0
  } else {
    state.startStep = null
    state.phase = 'loop'
    state.actorSeat = state.initiative
    state.passStreak = 0
  }
}

/** End of round: end-of-round triggers → overextend bills → round-mods expire, then next round (spec §1.4). */
export function endRound(state: GameState, actorSeat: Seat) {
  // spec §1.4: end-of-round triggers fire FIRST (initiative holder's units first, entry/id order)
  for (const seat of [state.initiative, other(state.initiative)] as const) {
    for (const u of unitsOf(state, seat)) {
      if (state.winner !== null) return
      if (u.imprisoned) continue
      const own = defOf(state, u.id).endOfRound
      if (own && condHolds(state, seat, own.cond)) runOps({ state, controller: seat, sourceUnit: u.id, actorSeat }, own.ops)
      for (const upId of u.upgrades) {
        const up = defOf(state, upId).endOfRound
        if (up && condHolds(state, seat, up.cond)) runOps({ state, controller: seat, sourceUnit: u.id, actorSeat }, up.ops)
      }
    }
  }
  stateBasedCleanup(state, actorSeat)
  if (state.winner !== null) return

  // decision 35: units that overextended take their self-damage now
  for (const u of unitsOf(state)) {
    if (u.overextendedBy > 0) {
      u.damage += u.overextendedBy // self-inflicted strain ignores armor
      log(state, u.owner, `${defOf(state, u.id).name} suffers ${u.overextendedBy} from overextending`)
      u.overextendedBy = 0
    }
  }
  for (const u of unitsOf(state)) {
    u.mods = u.mods.filter(m => !m.round)
    for (const m of u.mods) if (m.rounds !== undefined) m.rounds--   // v3 multi-round mods tick at round end
    u.mods = u.mods.filter(m => m.rounds === undefined || m.rounds > 0)
  }
  for (const t of state.attackTaxes) t.rounds--   // Unchained Rage's tax expires with its doubling
  state.attackTaxes = state.attackTaxes.filter(t => t.rounds > 0)
  state.preventBase = [0, 0]

  // decision 88 (Politician, #29): at round end, a seat with a Politician standing in Neutral
  // AND more units there than the opponent gains 1 influence — once, however many politicians
  {
    const inMiddle = (seat: Seat) => unitsOf(state, seat).filter(u => u.zone === 1).length
    const [ca, cb] = [inMiddle(0), inMiddle(1)]
    for (const seat of [0, 1] as const) {
      const majority = seat === 0 ? ca > cb : cb > ca
      if (!majority) continue
      if (!unitsOf(state, seat).some(u => u.zone === 1 && !u.imprisoned && hasKw(state, u, 'politician'))) continue
      addInfluence(state, seat, 1)
      log(state, seat, `${state.sides[seat].name}'s politician sways the middle (+1 influence)`)
    }
  }
  stateBasedCleanup(state, actorSeat)
  if (state.winner !== null) return

  // #88 (Devout Intervention) wards + #85 (Aura of Resolve) death ledger are per-round — clear them
  // at the boundary, after this round's deaths (incl. end-of-round overextend kills) have been tallied.
  state.homeWard = [false, false]
  state.blockerWard = [false, false]
  state.deaths = [0, 0]
  for (const u of unitsOf(state)) if (u.blockWard) u.blockWard = false

  state.outOfRound = [false, false]
  state.claimedThisRound = false
  state.pendingExtraAction = null
  state.round += 1
  startRound(state)
}
