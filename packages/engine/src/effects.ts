import type {
  AutoPick, GameState, Op, Seat, TargetRef, UnitFilter, UnitInstance, ZoneId,
} from './types.ts'
import { EngineError, adjacent } from './types.ts'
import {
  addInfluence, checkWin, condHolds, defOf, draw, effArmor, effHealth, effPower,
  idNum, influenceFor, log, other, thresholds, unitsInZone, unitsOf,
} from './helpers.ts'

export interface FxCtx {
  state: GameState
  controller: Seat
  /** unit the effect belongs to (unit triggers), or the carrier for upgrade effects */
  sourceUnit?: string
  /** play-time chosen targets, in TargetSpec order */
  targets?: TargetRef[]
  /** during combat: the attack target */
  attackTarget?: TargetRef
  /** zone just entered, for onEnterZone */
  enteredZone?: ZoneId
  actorSeat: Seat
}

const name = (state: GameState, id: string) => defOf(state, id).name

function unitById(state: GameState, id: string): UnitInstance | undefined {
  return state.units[id]
}

/** Deterministic auto-pick: highest effective power, ties broken by lowest instance id. */
function pickStrongest(state: GameState, candidates: UnitInstance[]): UnitInstance | undefined {
  return candidates
    .slice()
    .sort((a, b) => effPower(state, b) - effPower(state, a) || idNum(a.id) - idNum(b.id))[0]
}

function filterUnits(ctx: FxCtx, f: UnitFilter): UnitInstance[] {
  const { state, controller } = ctx
  const src = ctx.sourceUnit ? unitById(state, ctx.sourceUnit) : undefined
  return unitsOf(state).filter(u => {
    if (f.side === 'friendly' && u.owner !== controller) return false
    if (f.side === 'enemy' && u.owner === controller) return false
    if (f.other && u.id === ctx.sourceUnit) return false
    if (f.maxPower !== undefined && effPower(state, u) > f.maxPower) return false
    if (f.zone === 'sameAsSelf' && (!src || u.zone !== src.zone)) return false
    if (f.zone === 'adjacentToSelf' && (!src || !adjacent(u.zone, src.zone))) return false
    if (f.zone === 'chosenZone') {
      const z = ctx.targets?.find(t => t.kind === 'zone') as { kind: 'zone'; zone: ZoneId } | undefined
      if (!z || u.zone !== z.zone) return false
    }
    return true
  })
}

function resolveUnitTarget(ctx: FxCtx, t: string): UnitInstance | undefined {
  const { state } = ctx
  if (t === 'self' || t === 'attached') return ctx.sourceUnit ? unitById(state, ctx.sourceUnit) : undefined
  if (t === 'chosen0' || t === 'chosen1') {
    const ref = ctx.targets?.[t === 'chosen0' ? 0 : 1]
    return ref?.kind === 'unit' ? unitById(state, ref.id) : undefined
  }
  if (t === 'attackTarget') {
    return ctx.attackTarget?.kind === 'unit' ? unitById(state, ctx.attackTarget.id) : undefined
  }
  if (t === 'autoSplash') {
    if (ctx.attackTarget?.kind !== 'unit') return undefined
    const tgt = unitById(state, ctx.attackTarget.id)
    if (!tgt) return undefined
    const cands = unitsInZone(state, tgt.zone, tgt.owner).filter(u => u.id !== tgt.id)
    return pickStrongest(state, cands)
  }
  return undefined
}

export function damageUnit(state: GameState, unit: UnitInstance, n: number, source: string) {
  // v3 Shielded: the first damage instance is prevented entirely (one event, one token)
  if (unit.shielded && n > 0) {
    unit.shielded = false
    log(state, unit.owner, `${defOf(state, unit.id).name}'s shield absorbs the blow`)
    return
  }
  const dealt = Math.max(0, n - effArmor(state, unit))
  if (dealt <= 0) { log(state, unit.owner, `${name(state, unit.id)} shrugs off the damage (armor)`); return }
  unit.damage += dealt
  log(state, unit.owner, `${name(state, unit.id)} takes ${dealt} damage${source ? ` from ${source}` : ''}`)
}

export function damageBase(state: GameState, seat: Seat, n: number, source: string) {
  let dmg = n
  if (state.preventBase[seat] > 0) {
    const absorbed = Math.min(state.preventBase[seat], dmg)
    state.preventBase[seat] -= absorbed
    dmg -= absorbed
    log(state, seat, `${state.sides[seat].name} prevents ${absorbed} base damage`)
  }
  if (dmg <= 0) return
  state.sides[seat].life -= dmg
  log(state, seat, `${state.sides[seat].name} takes ${dmg} damage${source ? ` from ${source}` : ''} (${Math.max(0, state.sides[seat].life)} life)`)
}

export function imprisonUnit(ctx: FxCtx, unit: UnitInstance) {
  const { state, controller } = ctx
  if (unit.imprisoned) return
  if (unit.owner === controller) return // no self-jailing in the card pool; guard against filter slips
  unit.imprisoned = { by: controller, source: ctx.sourceUnit ?? null }
  log(state, controller, `${name(state, unit.id)} is imprisoned`)
  // imprisonWatchers (Gateward Colossus): any non-imprisoned unit with the static
  for (const w of unitsOf(state)) {
    if (w.imprisoned) continue
    for (const st of defOf(state, w.id).statics ?? []) {
      if (st.s === 'imprisonWatcher') {
        addInfluence(state, w.owner, st.n)
        log(state, w.owner, `${name(state, w.id)} grants ${st.n} influence`)
      }
    }
  }
}

export function releaseUnit(state: GameState, unit: UnitInstance, why: string) {
  if (!unit.imprisoned) return
  unit.imprisoned = null
  log(state, unit.owner, `${name(state, unit.id)} is released (${why})`)
}

function autoImprison(ctx: FxCtx, auto: AutoPick) {
  const { state, controller } = ctx
  const src = ctx.sourceUnit ? unitById(state, ctx.sourceUnit) : undefined
  const eligible = (zone?: ZoneId) =>
    unitsOf(state, other(controller)).filter(u =>
      !u.imprisoned
      && (auto.maxPower === undefined || effPower(state, u) <= auto.maxPower)
      && (zone === undefined || u.zone === zone))
  if (auto.scope === 'eachZone') {
    for (const zone of [0, 1, 2] as ZoneId[]) {
      const pick = pickStrongest(state, eligible(zone))
      if (pick) imprisonUnit(ctx, pick)
    }
    return
  }
  let zone: ZoneId | undefined
  if (auto.scope === 'enteredZone') zone = ctx.enteredZone ?? src?.zone
  else if (auto.scope === 'targetZone') {
    const t = ctx.attackTarget
    zone = t?.kind === 'unit' ? unitById(ctx.state, t.id)?.zone : undefined
  } else if (auto.scope === 'otherZone') {
    // any zone except the source's — flatten candidates across them
    const pick = pickStrongest(state, eligible().filter(u => !src || u.zone !== src.zone))
    if (pick) imprisonUnit(ctx, pick)
    return
  }
  if (zone === undefined) return
  const pick = pickStrongest(state, eligible(zone))
  if (pick) imprisonUnit(ctx, pick)
}

export function runOps(ctx: FxCtx, ops: Op[]) {
  const { state, controller } = ctx
  for (const op of ops) {
    if (state.winner !== null) return
    switch (op.op) {
      case 'damage': {
        const base = op.n === 'linked' ? (ctx.linked ?? 0) : op.n   // v3: "that much" (spec §3)
        if (op.t === 'enemyBase') { if (base > 0) damageBase(state, other(controller), base, ''); break }
        if (op.t === 'selfBase') { if (base > 0) damageBase(state, controller, base, ''); break }
        // chosen targets may be a base ref
        if ((op.t === 'chosen0' || op.t === 'chosen1')) {
          const ref = ctx.targets?.[op.t === 'chosen0' ? 0 : 1]
          if (ref?.kind === 'base') { if (base > 0) damageBase(state, ref.seat, base, ''); break }
        }
        const u = resolveUnitTarget(ctx, op.t)
        // v3 conditional bonus (Devastating Strike): read the target's state BEFORE the hit
        const n = u && op.bonusIfDamaged && u.damage > 0 ? base + op.bonusIfDamaged : base
        if (u && n > 0) damageUnit(state, u, n, '')
        break
      }
      case 'exhaust': {
        const targets = typeof op.t === 'string' ? [resolveUnitTarget(ctx, op.t)].filter(Boolean) as UnitInstance[] : filterUnits(ctx, op.t)
        for (const u of targets) { u.exhausted = true; log(state, u.owner, `${name(state, u.id)} is ordered down`) }
        break
      }
      case 'freeCaptives': {
        for (const [cid, c] of Object.entries(state.captives)) {
          if (c.unit.owner !== controller) continue
          const holder = state.units[c.by]
          c.unit.zone = holder ? holder.zone : c.unit.zone
          c.unit.exhausted = true
          c.unit.enteredRound = state.round
          state.units[cid] = c.unit
          delete state.captives[cid]
          log(state, controller, `${name(state, cid)} is freed, dazed`)
        }
        break
      }
      case 'clearDamage': {
        const u = resolveUnitTarget(ctx, op.t)
        if (!u) { ctx.linked = 0; break }
        ctx.linked = u.damage                            // v3: the amount removed becomes the linked value
        if (u.damage > 0) log(state, u.owner, `${name(state, u.id)} is made whole (${u.damage} damage removed)`)
        u.damage = 0
        break
      }
      case 'damageFilter': {
        for (const u of filterUnits(ctx, op.f)) damageUnit(state, u, op.n, '')
        break
      }
      case 'heal': {
        if (op.t === 'selfBase') {
          const side = state.sides[controller]
          const healed = Math.min(state.rules.startingLife, side.life + op.n) - side.life
          side.life += healed
          if (healed > 0) log(state, controller, `${side.name} heals ${healed} (${side.life} life)`)
          break
        }
        const ref = ctx.targets?.[0]
        if (ref?.kind === 'base') {
          const side = state.sides[ref.seat]
          const healed = Math.min(state.rules.startingLife, side.life + op.n) - side.life
          side.life += healed
          if (healed > 0) log(state, ref.seat, `${side.name} heals ${healed} (${side.life} life)`)
        } else {
          const u = resolveUnitTarget(ctx, 'chosen0')
          if (u) {
            const healed = Math.min(u.damage, op.n)
            u.damage -= healed
            if (healed > 0) log(state, u.owner, `${name(state, u.id)} heals ${healed}`)
          }
        }
        break
      }
      case 'draw': draw(state, controller, op.n); log(state, controller, `${state.sides[controller].name} draws ${op.n}`); break
      case 'influence': {
        addInfluence(state, controller, op.n)
        log(state, controller, `${state.sides[controller].name} ${op.n >= 0 ? 'gains' : 'cedes'} ${Math.abs(op.n)} influence (${influenceFor(state, controller)})`)
        break
      }
      case 'imprison': {
        if (op.t === 'auto' && op.auto) { autoImprison(ctx, op.auto); break }
        if (op.f) { for (const u of filterUnits(ctx, op.f)) imprisonUnit(ctx, u); break }
        const u = resolveUnitTarget(ctx, op.t)
        if (u) imprisonUnit(ctx, u)
        break
      }
      case 'buff': {
        const targets = typeof op.t === 'string' ? [resolveUnitTarget(ctx, op.t)].filter(Boolean) as UnitInstance[] : filterUnits(ctx, op.t)
        for (const u of targets) {
          if (!condHolds(state, controller, op.cond)) continue
          u.mods.push({ p: op.p, h: op.h, armor: op.armor, round: op.dur === 'round' })
          const bits = [op.p ? `${op.p > 0 ? '+' : ''}${op.p} power` : '', op.armor ? `+${op.armor} armor` : ''].filter(Boolean).join(', ')
          log(state, u.owner, `${name(state, u.id)} gets ${bits}${op.dur === 'round' ? ' this round' : ''}`)
        }
        break
      }
      case 'double': {
        const targets = typeof op.t === 'string' ? [resolveUnitTarget(ctx, op.t)].filter(Boolean) as UnitInstance[] : filterUnits(ctx, op.t)
        for (const u of targets) {
          u.mods.push(op.rounds ? { double: true, rounds: op.rounds } : { double: true, round: true })
          log(state, u.owner, `${name(state, u.id)}'s power is doubled${op.rounds ? ` for ${op.rounds} rounds` : ' this round'}`)
        }
        break
      }
      case 'countBuff': {
        const u = resolveUnitTarget(ctx, op.t)
        if (!u) break
        let count = 0
        for (const cand of Object.values(state.units)) {
          if (cand.zone !== u.zone) continue
          if (op.per.other && cand.id === u.id) continue
          if (op.per.color && defOf(state, cand.id).color !== op.per.color) continue
          if (op.per.side === 'friendly' && cand.owner !== controller) continue
          if (op.per.side === 'enemy' && cand.owner === controller) continue
          count++
        }
        if (count > 0) {
          u.mods.push({ p: op.p * count, ...(op.dur === 'round' ? { round: true } : {}) })
          log(state, u.owner, `${name(state, u.id)} gets +${op.p * count} power (${count} in the pack)`)
        }
        break
      }
      case 'grant': {
        const targets = typeof op.t === 'string' ? [resolveUnitTarget(ctx, op.t)].filter(Boolean) as UnitInstance[] : filterUnits(ctx, op.t)
        for (const u of targets) {
          u.mods.push({ kw: op.kw, round: op.dur === 'round' })
          log(state, u.owner, `${name(state, u.id)} gains ${op.kw.k}${op.kw.n !== undefined ? ` ${op.kw.n}` : ''}${op.dur === 'round' ? ' this round' : ''}`)
        }
        break
      }
      case 'destroy': {
        const u = resolveUnitTarget(ctx, op.t)
        if (u) destroyUnit(state, u, 'destroyed')
        break
      }
      case 'destroyUpgrade': {
        const ref = ctx.targets?.find(t => t.kind === 'upgrade') as { kind: 'upgrade'; id: string } | undefined
        if (!ref) break
        const up = state.upgrades[ref.id]
        if (!up) break
        const carrier = unitById(state, up.attachedTo)
        if (carrier) carrier.upgrades = carrier.upgrades.filter(id => id !== up.id)
        state.sides[up.owner].discard.push(up.id)
        delete state.upgrades[up.id]
        log(state, controller, `${name(state, ref.id)} is destroyed`)
        break
      }
      case 'ready': {
        if (op.t) {
          const u = resolveUnitTarget(ctx, op.t)
          if (u && u.owner === controller) { u.exhausted = false; log(state, u.owner, `${name(state, u.id)} readies`) }
          break
        }
        for (const u of unitsOf(state, controller)) u.exhausted = false
        log(state, controller, `${state.sides[controller].name}'s units ready for another assault`)
        break
      }
      case 'extraAction': {
        state.pendingExtraAction = controller
        log(state, controller, `${state.sides[controller].name} lines up an extra action`)
        break
      }
      case 'preventBase': {
        state.preventBase[controller] += op.n
        log(state, controller, `${state.sides[controller].name} wards ${op.n} base damage this round`)
        break
      }
      case 'removeNegative': {
        const u = resolveUnitTarget(ctx, op.t)
        if (!u) break
        if (u.imprisoned) releaseUnit(state, u, 'absolved')
        u.mods = u.mods.filter(m => (m.p ?? 0) >= 0 && (m.h ?? 0) >= 0)
        log(state, u.owner, `${name(state, u.id)} is cleansed`)
        break
      }
      case 'capture': {
        const t = resolveUnitTarget(ctx, op.t)
        if (!t) break
        const srcU = op.by === 'chosen0'
          ? (ctx.targets?.[0]?.kind === 'unit' ? state.units[ctx.targets[0].id] : undefined)
          : ctx.sourceUnit ? state.units[ctx.sourceUnit] : undefined
        if (!srcU) break
        // v3 Capture: out of play, under the capturer, upgrades ride along
        delete state.units[t.id]
        state.captives[t.id] = { unit: t, by: srcU.id }
        log(state, ctx.controller, `${name(state, srcU.id)} captures ${name(state, t.id)}`)
        break
      }
    }
    stateBasedCleanup(state, ctx.actorSeat)
  }
}

export function destroyUnit(state: GameState, unit: UnitInstance, why: string) {
  if (!state.units[unit.id]) return
  // v3 Capture: the capturer leaving play frees its captives — exhausted (decision 61)
  for (const [cid, c] of Object.entries(state.captives)) {
    if (c.by !== unit.id) continue
    c.unit.zone = unit.zone
    c.unit.exhausted = true
    c.unit.enteredRound = state.round
    state.units[cid] = c.unit
    delete state.captives[cid]
    log(state, c.unit.owner, `${name(state, cid)} is freed as ${name(state, unit.id)} falls`)
  }
  for (const upId of unit.upgrades) {
    const up = state.upgrades[upId]
    if (!up) continue
    if (state.rules.upgradesOrphan) {           // v3 (decision 67): the fallen's gear stays on the field
      up.attachedTo = null
      up.orphanedIn = unit.zone
      log(state, up.owner, `${name(state, upId)} lies where ${name(state, unit.id)} fell`)
    } else { state.sides[up.owner].discard.push(upId); delete state.upgrades[upId] }
  }
  unit.upgrades = []
  delete state.units[unit.id]
  state.sides[unit.owner].discard.push(unit.id)
  log(state, unit.owner, `${name(state, unit.id)} is ${why}`)
}

/** Deaths → prison releases → influence clamp → win check. Run after every batch of changes. */
export function stateBasedCleanup(state: GameState, actorSeat: Seat) {
  // deaths (loop: destroying a unit can drop auras that change effHealth of others)
  for (let guard = 0; guard < 10; guard++) {
    const dying = unitsOf(state).filter(u => u.damage >= effHealth(state, u))
    if (!dying.length) break
    for (const u of dying) destroyUnit(state, u, 'destroyed')
  }
  // prison release: source left play, or jailer influence below threshold
  for (const u of unitsOf(state)) {
    if (!u.imprisoned) continue
    if (u.imprisoned.source && !state.units[u.imprisoned.source]) { releaseUnit(state, u, 'its captor left play'); continue }
    if (influenceFor(state, u.imprisoned.by) < state.rules.prisonReleaseThreshold) releaseUnit(state, u, 'influence broke')
  }
  const [t0, t1] = thresholds(state)
  state.influence = Math.max(-t1, Math.min(t0, state.influence))
  checkWin(state, actorSeat)
}

/** Fire a unit-trigger key with an existing context; imprisoned sources are inert. */
export function fireTrigger(
  ctx: Omit<FxCtx, 'controller' | 'sourceUnit'>,
  unit: UnitInstance,
  key: 'onPlay' | 'onEnterZone' | 'onAttack' | 'onAttackBase' | 'onDefend' | 'onKill',
) {
  if (unit.imprisoned) return
  const run = (ops: Op[] | undefined, sourceUnit: string, controller: Seat) => {
    if (!ops?.length) return
    runOps({ ...ctx, controller, sourceUnit }, ops)
  }
  run(defOf(ctx.state, unit.id)[key], unit.id, unit.owner)
  for (const upId of unit.upgrades) run(defOf(ctx.state, upId)[key], unit.id, unit.owner)
}
