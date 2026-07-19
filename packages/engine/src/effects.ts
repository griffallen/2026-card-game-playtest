import type {
  AutoPick, GameState, Op, PerCount, Seat, TargetRef, UnitFilter, UnitInstance, ZoneId,
} from './types.ts'
import { EngineError, adjacent, homeZone } from './types.ts'
import {
  addInfluence, checkWin, condHolds, defOf, draw, effArmor, effHealth, effPower,
  idNum, influenceFor, log, moveDamageCap, other, unitsInZone, unitsOf,
} from './helpers.ts'

export interface FxCtx {
  state: GameState
  controller: Seat
  /** unit the effect belongs to (unit triggers), or the carrier for upgrade effects */
  sourceUnit?: string
  /** issue #64: name the card behind automatic ticks — start-of-round heals and influence
   *  logged bare read as invisible magic ("I figured they were playing actions to heal") */
  srcLabel?: string
  /** play-time chosen targets, in TargetSpec order */
  targets?: TargetRef[]
  /** during combat: the attack target */
  attackTarget?: TargetRef
  /** during an onDefend trigger: how many units attack the defending unit (PR #70, `per:{count:'attackers'}`) */
  attackerCount?: number
  /** zone just entered, for onEnterZone */
  enteredZone?: ZoneId
  /** #104 (Lawbringer): the player-chosen enemy id for a `choose` entry-exhaust — validated and
   *  carried by the play/move action. Undefined = no eligible enemy in the entered zone (no-op). */
  entryExhaust?: string
  /** declared X for xCost cards (issue #45) */
  x?: number
  /** #104 (Censer of Purity): the player-chosen amount for an activated ability (moveDamage) */
  amount?: number
  /** attack-declared splash victims by attacker id (PR #46: splashReap) */
  splashChoice?: Record<string, string>
  /** v3 "that much" link: written by clearDamage, read by damage n:'linked' (spec §3) */
  linked?: number
  /** #69 (createCopies): generations of effect-created units above this context. The ifOnlyCopy
   *  gate is the real fuse; this cap only stops a future mis-gated card from looping forever. */
  spawnDepth?: number
  /** #107 (Flameblade Raider): snapshot of the dying unit's justKilled at onDeath time — the body is
   *  already off the field, so an `ifKilled` influence op reads the trade from here, not from state. */
  sourceKilled?: boolean
  actorSeat: Seat
}

const name = (state: GameState, id: string) => defOf(state, id).name

function unitById(state: GameState, id: string | null): UnitInstance | undefined {
  return id === null ? undefined : state.units[id]
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
    // #89 (Radiant Judgment): cost cap tied to the controller's LIVE influence, read at resolution
    if (f.maxCostInfluence && defOf(state, u.id).cost > influenceFor(state, controller)) return false
    if (f.zone === 'sameAsSelf' && (!src || u.zone !== src.zone)) return false
    if (f.zone === 'adjacentToSelf' && (!src || !adjacent(u.zone, src.zone))) return false
    if (f.zone === 'controllerHome' && u.zone !== homeZone(controller)) return false
    if (f.zone === 'chosenZone') {
      const z = ctx.targets?.find(t => t.kind === 'zone') as { kind: 'zone'; zone: ZoneId } | undefined
      if (!z || u.zone !== z.zone) return false
    }
    return true
  })
}

/** PR #70/#71: the multiplier for a count-scaled op. No `per` → 1 (flat, unchanged).
 *  'attackers' reads the onDefend trigger's attacker count (0 outside combat); 'units' counts
 *  in-play units matching the filter (reusing the same filter the exhaust/damageFilter ops use). */
function perCount(ctx: FxCtx, per: PerCount | undefined): number {
  if (!per) return 1
  if (per.count === 'attackers') return ctx.attackerCount ?? 0
  // #85 (Aura of Resolve): the per-round death ledger, from the controller's perspective
  if (per.count === 'deathsThisRound') {
    return ctx.state.deaths[per.side === 'friendly' ? ctx.controller : other(ctx.controller)]
  }
  // #107 (Warpath): the controller's live Influence magnitude; `half` floors half of it (the board pump)
  if (per.count === 'influence') {
    const m = Math.abs(influenceFor(ctx.state, ctx.controller))
    return per.half ? Math.floor(m / 2) : m
  }
  // #122 (Assassin's Contract): the chosen0 target, read live before a same-action destroy.
  if (per.count === 'targetRemainingHealth' || per.count === 'targetCostHalf') {
    const ref = ctx.targets?.[0]
    const u = ref?.kind === 'unit' ? ctx.state.units[ref.id] : undefined
    if (!u) return 0
    if (per.count === 'targetRemainingHealth') return Math.max(0, effHealth(ctx.state, u) - u.damage)
    const def = defOf(ctx.state, u.id)   // targetCostHalf: ceil(cost/2), X-cost → 0
    return def.xCost ? 0 : Math.ceil(def.cost / 2)
  }
  // #122 (The Unseen Court): GLOBAL live Exhausted-unit counts off the whole board (not ctx.targets).
  // The Sneak's Influence sees Exhausted ENEMY units; its Life bleed sees EVERY Exhausted body on
  // either side, EXCEPT the source court itself — the Sneak taps it before these resolve, and excluding
  // it makes an empty board a clean no-op rather than the court bleeding the enemy off its own tap.
  if (per.count === 'exhaustedEnemyUnits') {
    return unitsOf(ctx.state).filter(u => u.owner !== ctx.controller && u.exhausted).length
  }
  if (per.count === 'allExhaustedUnits') {
    return unitsOf(ctx.state).filter(u => u.exhausted && u.id !== ctx.sourceUnit).length
  }
  return filterUnits(ctx, per.f).length
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

export function damageUnit(state: GameState, unit: UnitInstance, n: number, source: string, pierce = false) {
  // #107 (Worldrender): a piercing hit ignores the target's Shield and Armor entirely — full damage
  // lands, and the shield token is NOT spent (the pierce doesn't remove the enemy's keywords).
  if (pierce) {
    if (n <= 0) return
    unit.damage += n
    log(state, unit.owner, `${name(state, unit.id)} takes ${n} damage${source ? ` from ${source}` : ''} (through shield and armor)`)
    return
  }
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

export function damageBase(state: GameState, seat: Seat, n: number, source: string, fromAttack = false) {
  let dmg = n
  // #88 (Devout Intervention, Ward 1): the next DAMAGING attack on this Home is fully warded and
  // the ward is spent. Only real prevention consumes it — a feint (fully blocked, no base damage)
  // never reaches here, so the ward waits. Direct-damage spells pass fromAttack=false → unaffected.
  if (fromAttack && dmg > 0 && state.homeWard[seat]) {
    state.homeWard[seat] = false
    log(state, seat, `${state.sides[seat].name}'s ward turns the assault from the gates`)
    return
  }
  if (state.preventBase[seat] > 0) {
    const absorbed = Math.min(state.preventBase[seat], dmg)
    state.preventBase[seat] -= absorbed
    dmg -= absorbed
    log(state, seat, `${state.sides[seat].name} prevents ${absorbed} base damage`)
  }
  if (dmg <= 0) return
  state.sides[seat].life -= dmg
  log(state, seat, `${state.sides[seat].name} takes ${dmg} damage${source ? ` from ${source}` : ''} (${state.sides[seat].life} life)`)  // decision 104: life may read negative
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

/** #104 (Lawbringer): the deterministic enemy an auto-scoped, zone-bound op arrests — the strongest
 *  READY (non-exhausted, non-imprisoned) enemy in the resolved zone. On an onEnterZone trigger the
 *  scope is 'enteredZone' → the zone the source just marched into (ctx.enteredZone, which equals the
 *  source's current zone). Undefined = no eligible enemy there (a clean no-op). Mirrors the
 *  imprison auto path (autoImprison), but skips the already-exhausted: re-exhausting a down unit is a
 *  wasted arrest, so the law lands on one still standing. */
function autoPickEnemy(ctx: FxCtx, auto: AutoPick): UnitInstance | undefined {
  const { state, controller } = ctx
  const src = ctx.sourceUnit ? unitById(state, ctx.sourceUnit) : undefined
  let zone: ZoneId | undefined
  if (auto.scope === 'enteredZone') zone = ctx.enteredZone ?? src?.zone
  else if (auto.scope === 'targetZone') {
    const t = ctx.attackTarget
    zone = t?.kind === 'unit' ? unitById(state, t.id)?.zone : undefined
  }
  if (zone === undefined) return undefined
  const cands = unitsOf(state, other(controller)).filter(u =>
    u.zone === zone && !u.imprisoned && !u.exhausted
    && (auto.maxPower === undefined || effPower(state, u) <= auto.maxPower))
  return pickStrongest(state, cands)
}

export function runOps(ctx: FxCtx, ops: Op[]) {
  const { state, controller } = ctx
  for (const op of ops) {
    if (state.winner !== null) return
    switch (op.op) {
      case 'damage': {
        if (!condHolds(state, controller, op.cond)) break            // #107 (Warpath): the self-life price is paid only while the controller's state holds (ahead on Influence)
        const raw = op.n === 'linked' ? (ctx.linked ?? 0) : op.n     // v3: "that much" (spec §3)
        const base = op.per ? raw * perCount(ctx, op.per) : raw       // #85: scale by a live count
        const src = ctx.srcLabel ?? ''   // #74: name the card behind effect damage so the recap can show it
        if (op.t === 'enemyBase') { if (base > 0) damageBase(state, other(controller), base, src); break }
        if (op.t === 'selfBase') { if (base > 0) damageBase(state, controller, base, src); break }
        // chosen targets may be a base ref
        if ((op.t === 'chosen0' || op.t === 'chosen1')) {
          const ref = ctx.targets?.[op.t === 'chosen0' ? 0 : 1]
          if (ref?.kind === 'base') { if (base > 0) damageBase(state, ref.seat, base, src); break }
        }
        const u = resolveUnitTarget(ctx, op.t)
        // v3 conditional bonus (Devastating Strike): read the target's state BEFORE the hit
        const n = u && op.bonusIfDamaged && u.damage > 0 ? base + op.bonusIfDamaged : base
        if (u && n > 0) damageUnit(state, u, n, src)
        break
      }
      case 'exhaust': {
        // #104 (Lawbringer): t:'auto' arrests one enemy in the source's (entered) zone. With
        // auto.choose the entering player picked which (carried in ctx.entryExhaust, validated at the
        // action boundary); without it, the deterministic strongest-ready auto-pick.
        let targets: UnitInstance[]
        if (op.t === 'auto') {
          if (op.auto!.choose) {
            const u = ctx.entryExhaust ? unitById(state, ctx.entryExhaust) : undefined
            targets = u ? [u] : []
          } else {
            targets = [autoPickEnemy(ctx, op.auto!)].filter(Boolean) as UnitInstance[]
          }
        } else if (typeof op.t === 'string') {
          targets = [resolveUnitTarget(ctx, op.t)].filter(Boolean) as UnitInstance[]
        } else {
          targets = filterUnits(ctx, op.t)
        }
        for (const u of targets) { u.exhausted = true; log(state, u.owner, `${name(state, u.id)} is ordered down`) }
        break
      }
      case 'move': {
        // decision 72 (Reckless Charge): relocate the unit to the chosen zone — exhausted or
        // not, exhausting nothing. Adjacency is the target spec's job (adjacentToFirst).
        const u = resolveUnitTarget(ctx, op.t)
        const z = ctx.targets?.find(t => t.kind === 'zone')
        if (u && z && z.kind === 'zone' && u.zone !== z.zone) {
          u.zone = z.zone
          log(state, controller, `${name(state, u.id)} charges to ${z.zone === 1 ? 'the Neutral zone' : `${state.sides[z.zone === 0 ? 0 : 1].name}'s Home`}`)
          // a lunge is an entrance — "enters a zone" triggers fire, same as a normal move
          fireTrigger({ state, enteredZone: z.zone, actorSeat: ctx.actorSeat }, u, 'onEnterZone')
        }
        break
      }
      case 'attackTax': {
        // PR #39 (Unchained Rage): the fury has a price — each attacking unit cedes influence
        state.attackTaxes.push({ seat: controller, n: op.n, rounds: op.rounds })
        log(state, controller, `${state.sides[controller].name}'s rage is unchained — each attacking unit will cede ${op.n} influence for ${op.rounds} rounds`)
        break
      }
      case 'doom': {
        // PR #38 (Final Onslaught): mark the readied unit — after the extra action, it dies
        const u = resolveUnitTarget(ctx, op.t)
        if (u) {
          state.doom = { unit: u.id, seat: controller, stage: 'fresh' }
          log(state, controller, `${name(state, u.id)} charges into its final onslaught`)
        }
        break
      }
      case 'freeCaptives': {
        for (const [cid, c] of Object.entries(state.captives)) {
          if (c.unit.owner !== controller) continue
          const holder = state.units[c.by]
          c.unit.zone = holder ? holder.zone : c.unit.zone
          c.unit.exhausted = false   // decision 73 (reverses 61): freed captives return whole
          c.unit.enteredRound = state.round
          state.units[cid] = c.unit
          delete state.captives[cid]
          log(state, controller, `${name(state, cid)} is freed, ready`)
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
        // #107 (Crimson Behemoth): with creditsKills, the source's onKill fires for every unit this
        // AoE fells — friend or foe. Batch the damage first, then credit (decision 74: a kill is a
        // kill; lethality is the test), mirroring how combat lands all blows before crediting kills.
        const killer = op.creditsKills && ctx.sourceUnit ? unitById(state, ctx.sourceUnit) : undefined
        const felled: string[] = []
        for (const u of filterUnits(ctx, op.f)) {
          damageUnit(state, u, op.n, ctx.srcLabel ?? '')
          if (killer && state.units[u.id] && u.damage >= effHealth(state, u)) felled.push(u.id)
        }
        for (const id of felled) {
          if (state.winner !== null) break
          if (state.units[killer!.id]) fireTrigger({ state, attackTarget: { kind: 'unit', id }, actorSeat: ctx.actorSeat }, killer!, 'onKill')
        }
        break
      }
      case 'heal': {
        const n = op.per ? op.n * perCount(ctx, op.per) : op.n   // PR #71: scale by unit count
        if (op.t === 'selfBase') {
          const side = state.sides[controller]
          if (n > 0) { side.life += n; log(state, controller, `${side.name} heals ${n} (${side.life} life)` + (ctx.srcLabel ? ` — ${ctx.srcLabel}` : '')) }  // decision 104: no life cap — overheal past starting life is allowed
          break
        }
        const ref = ctx.targets?.[0]
        if (ref?.kind === 'base') {
          const side = state.sides[ref.seat]
          if (n > 0) { side.life += n; log(state, ref.seat, `${side.name} heals ${n} (${side.life} life)` + (ctx.srcLabel ? ` — ${ctx.srcLabel}` : '')) }  // decision 104: no life cap
        } else {
          const u = resolveUnitTarget(ctx, 'chosen0')
          if (u) {
            const healed = Math.min(u.damage, n)
            u.damage -= healed
            if (healed > 0) log(state, u.owner, `${name(state, u.id)} heals ${healed}`)
          }
        }
        break
      }
      case 'moveDamage': {
        // #104 (Censer of Purity): lift ctx.amount damage off `from` and onto `to`. A transfer of
        // existing wounds — NOT a fresh hit — so it bypasses damageUnit's armor/shield mitigation and
        // adjusts the damage markers directly. Capped so the sink never falls below 0 Health; if it
        // reaches exactly 0 the op-tail stateBasedCleanup fells it on the normal lethality path.
        const from = resolveUnitTarget(ctx, op.from)
        const to = resolveUnitTarget(ctx, op.to)
        if (!from || !to || from.id === to.id) break
        const n = Math.min(ctx.amount ?? 0, moveDamageCap(state, from, to))
        if (n <= 0) break
        from.damage -= n
        to.damage += n
        log(state, to.owner, `${name(state, to.id)} draws ${n} damage off ${name(state, from.id)}`)
        break
      }
      case 'lastStand': {
        // #107 (Last Stand): register the round-scoped pact for the controller. The mass-ready is a
        // separate `ready` op; here we arm the no-exhaust state + the per-action tolls (billed in
        // moveUnit / attackDeclare) + the end-of-round self-cost (settled in endRound). Stacks per cast.
        state.lastStands.push({
          seat: controller,
          moveInfluence: op.moveInfluence,
          attackLife: op.attackLife,
          endLife: op.endLife,
          endInfluence: op.endInfluence,
        })
        log(state, controller, `${state.sides[controller].name} makes a last stand — units won't exhaust this round, but every move and attack exacts its price`)
        break
      }
      case 'reckoning': {
        // #122 (Midnight Reckoning): a self-contained AoE finisher — all of it resolves inline
        // (Griff: "everything resolves inside the card's effects"). Damage EVERY unit — both sides,
        // the caster's own included (Griff: "all units," literal) — by n, then pay the controller
        // influencePerKill per unit the sweep fells (decision 74: a kill is a kill; lethality is the
        // test, friend AND foe). filterUnits with side:'all'/zone:'all' reads no source unit — good,
        // because an ACTION has no body (ctx.sourceUnit is undefined), which is also why this can't
        // reuse damageFilter's creditsKills/onKill (those fire on a UNIT's def). The felled-detection
        // mirrors damageFilter exactly (batch the damage, then `state.units[u.id] && damage >= effHealth`).
        let felled = 0
        for (const u of filterUnits(ctx, { side: 'all', zone: 'all' })) {
          damageUnit(state, u, op.n, ctx.srcLabel ?? '')
          if (state.units[u.id] && u.damage >= effHealth(state, u)) felled++
        }
        if (felled > 0) {
          addInfluence(state, controller, felled * op.influencePerKill)
          log(state, controller, `the reckoning claims ${felled} ${felled === 1 ? 'soul' : 'souls'} — ${state.sides[controller].name} gains ${felled * op.influencePerKill} influence (${influenceFor(state, controller)})`)
        }
        // "gained less than killThreshold Influence" == "fewer than killThreshold units fell" (each
        // kill = +1). shortfallLife burns the opponent's FACE through the standard damageBase — the
        // same spell-to-face path a `damage enemyBase` burn uses: it respects preventBase and does NOT
        // pierce (the ruled default). (homeWard is attack-only — fromAttack — so a spell burn never
        // touches it, exactly like every other burn.) The op-tail stateBasedCleanup fells the dead.
        if (felled < op.killThreshold) {
          log(state, other(controller), `the reckoning is unsated (${felled} of ${op.killThreshold}) — ${state.sides[other(controller)].name} answers with ${op.shortfallLife} life`)
          damageBase(state, other(controller), op.shortfallLife, ctx.srcLabel ?? '')
        } else {
          log(state, controller, `the reckoning is sated — the field is bare enough`)
        }
        break
      }
      case 'draw': draw(state, controller, op.n); log(state, controller, `${state.sides[controller].name} draws ${op.n}`); break
      case 'chooseFromHand': {
        // #122 (pick-from-hand foundation): ENQUEUE the pick(s) — do NOT resolve inline. applyAction
        // drains the queue AFTER runOps returns (phase 'choose'), so this op MUST be terminal in its
        // op-list; no later op may depend on which card is chosen (a real continuation is out of scope).
        // who:'controller' (default) queues for the controller; 'each' queues the controller THEN the
        // opponent. Eligibility is checked at enqueue time: we never queue more entries for a seat than
        // it has cards (already-queued entries counted), so every entry is drainable — an empty hand is
        // a silent no-op (a discard, not an empty draw: decision 33's life/influence penalty does NOT
        // apply). Nothing touches a hand between enqueue and drain, so this count cannot drift.
        const n = op.n ?? 1
        const seats: Seat[] = op.who === 'each' ? [controller, other(controller)] : [controller]
        for (const s of seats) {
          const alreadyQueued = state.pendingChoices.filter(c => c.seat === s).length
          const avail = state.sides[s].hand.length - alreadyQueued
          const k = Math.min(n, Math.max(0, avail))
          for (let i = 0; i < k; i++) state.pendingChoices.push({ seat: s, to: op.to, srcLabel: ctx.srcLabel ?? '' })
          if (k === 0) log(state, s, `${state.sides[s].name} has nothing to ${op.to === 'discard' ? 'discard' : 'put on the bottom of their deck'}`)
        }
        break
      }
      case 'influence': {
        if (!condHolds(state, controller, op.cond)) break        // #79 (Radiant Aegis): the gain is gated on the controller's state
        if (op.ifKilled && !ctx.sourceKilled) break              // #107 (Flameblade Raider): the trade bonus — only if this unit died dealing a lethal blow
        const n = op.per ? op.n * perCount(ctx, op.per) : op.n   // PR #70/#71: scale by attacker/unit count
        if (n === 0) break                                       // per counted zero — a no-op, not a "gains 0" line
        addInfluence(state, controller, n)
        log(state, controller, `${state.sides[controller].name} ${n >= 0 ? 'gains' : 'cedes'} ${Math.abs(n)} influence (${influenceFor(state, controller)})` + (ctx.srcLabel ? ` — ${ctx.srcLabel}` : ''))
        break
      }
      case 'influenceOwner': {
        // #122 (Assassin's Contract): the gain goes to the CHOSEN target's OWNER, not the controller —
        // destroy an enemy unit and the enemy's Influence rises. Owner read live, before the destroy.
        const u = resolveUnitTarget(ctx, op.t)
        if (!u) break
        const n = op.per ? op.n * perCount(ctx, op.per) : op.n
        if (n === 0) break                                       // per counted zero (e.g. an X-cost target) — a no-op
        addInfluence(state, u.owner, n)
        log(state, u.owner, `${state.sides[u.owner].name} ${n >= 0 ? 'gains' : 'cedes'} ${Math.abs(n)} influence (${influenceFor(state, u.owner)})` + (ctx.srcLabel ? ` — ${ctx.srcLabel}` : ''))
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
        // #104 (Dawnspear Paladin): `per` scales the granted stats by a live count (+1 Power PER
        // attacker on defense). No `per` → mult 1 (flat, unchanged). A per that counts 0 is a no-op,
        // not a "+0" mod (mirrors the influence op's zero-count skip).
        const mult = perCount(ctx, op.per)
        if (op.per && mult === 0) break
        const p = op.p !== undefined ? op.p * mult : undefined
        const h = op.h !== undefined ? op.h * mult : undefined
        const armor = op.armor !== undefined ? op.armor * mult : undefined
        const targets = typeof op.t === 'string' ? [resolveUnitTarget(ctx, op.t)].filter(Boolean) as UnitInstance[] : filterUnits(ctx, op.t)
        for (const u of targets) {
          if (!condHolds(state, controller, op.cond)) continue
          u.mods.push({ p, h, armor, round: op.dur === 'round' })
          const bits = [p ? `${p > 0 ? '+' : ''}${p} power` : '', h ? `${h > 0 ? '+' : ''}${h} health` : '', armor ? `+${armor} armor` : ''].filter(Boolean).join(', ')
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
          // #79 (Radiant Aegis): Shielded is a live token, not a passive keyword — the keyword line
          // above only *displays* it, so granting the ward must raise the actual token (the boolean
          // damageUnit spends). The view drops the "shielded" tag the moment the token is gone.
          if (op.kw.k === 'shielded') u.shielded = true
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
      case 'wardHome': {   // #88 (Devout Intervention, Ward 1)
        state.homeWard[controller] = true
        log(state, controller, `${state.sides[controller].name} raises a ward over their Home — the next assault is turned aside`)
        break
      }
      case 'wardBlocker': {   // #88 (Devout Intervention, Ward 2)
        state.blockerWard[controller] = true
        log(state, controller, `${state.sides[controller].name}'s next blocker will be shielded from harm`)
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
      case 'xSurge': {   // issue #45: pay-any-X — cede X influence, +X power and Breakthrough for the round
        const u = resolveUnitTarget(ctx, op.t)
        if (!u) break
        const x = ctx.x ?? 0
        addInfluence(state, controller, -x)
        u.mods.push({ p: x, round: true })
        u.mods.push({ kw: { k: 'breakthrough' }, round: true })
        log(state, controller, `${state.sides[controller].name} cedes ${x} influence — ${name(state, u.id)} gets +${x} power and breakthrough this round`)
        break
      }
      case 'splashReap': {   // PR #46: the skewer — declared victim takes n; a kill reaps influence
        const victimId = ctx.sourceUnit ? ctx.splashChoice?.[ctx.sourceUnit] : undefined
        const v = victimId ? state.units[victimId] : undefined
        if (!v) break
        damageUnit(state, v, op.n, name(state, ctx.sourceUnit!))
        const dead = state.units[v.id] && state.units[v.id].damage >= effHealth(state, state.units[v.id])
        if (dead && op.influence > 0) {
          addInfluence(state, controller, op.influence)
          log(state, controller, `the skewer reaps: ${state.sides[controller].name} gains ${op.influence} influence`)
        }
        break
      }
      case 'createCopies': {
        // #69 (Radiant Citadel): the game's first unit-creation op. Copies share the source's
        // slug (they ARE that card for counting, art, and name) but carry their own body via
        // UnitInstance.created — never a deck card, born ready in the controller's Home.
        const src = ctx.sourceUnit ? unitById(state, ctx.sourceUnit) : undefined
        if (!src) break
        const depth = ctx.spawnDepth ?? 0
        if (depth > 4) break   // hard fuse: a mis-gated future card must not spiral
        if (op.ifOnlyCopy && unitsOf(state, controller).filter(u => u.slug === src.slug).length !== 1) break
        const kw = op.kw ?? defOf(state, src.id).kw ?? []
        const born: UnitInstance[] = []
        for (let i = 0; i < op.n; i++) {
          const id = `c${state.nextId++}`   // deck ids come from the same counter — no collisions
          state.cardOf[id] = src.slug
          const copy: UnitInstance = {
            id, slug: src.slug, owner: controller, zone: homeZone(controller),
            damage: 0, exhausted: false, enteredRound: state.round, movedThisRound: false,
            shielded: kw.some(k => k.k === 'shielded'),
            imprisoned: null, upgrades: [], mods: [], overextendedBy: 0,
            created: {
              ...(op.p !== undefined ? { p: op.p } : {}),
              ...(op.h !== undefined ? { h: op.h } : {}),
              ...(op.kw ? { kw: op.kw } : {}),
            },
          }
          state.units[id] = copy
          born.push(copy)
        }
        const body = op.p !== undefined || op.h !== undefined ? ` (${op.p ?? '—'}/${op.h ?? '—'})` : ''
        log(state, controller, `${name(state, src.id)} raises ${op.n} ${op.n === 1 ? 'copy' : 'copies'} of itself${body}`)
        // the copies' own entry check runs too — against a board that now holds them, so a
        // gated card fizzles here (Griff's fuse: one cast, three walls, no spiral)
        for (const copy of born) {
          if (!state.units[copy.id]) continue
          fireTrigger({ state, actorSeat: ctx.actorSeat, srcLabel: name(state, copy.id), spawnDepth: depth + 1 }, copy, 'onPlay')
        }
        break
      }
      case 'capture': {
        const t = resolveUnitTarget(ctx, op.t)
        if (!t) break
        const srcU = op.by === 'chosen0'
          ? (ctx.targets?.[0]?.kind === 'unit' ? state.units[ctx.targets[0].id] : undefined)
          : ctx.sourceUnit ? state.units[ctx.sourceUnit] : undefined
        if (!srcU) break
        // v3 Capture: out of play, under the capturer. #112 (Griff): the captive sheds its
        // upgrades into the zone it held before capture — the gear does NOT ride into the cell.
        // Shed BEFORE removing the unit (shedUpgrades reads t.zone while it still knows it).
        shedUpgrades(state, t, true)
        delete state.units[t.id]
        state.captives[t.id] = { unit: t, by: srcU.id, ...(op.income ? { income: op.income } : {}) }
        log(state, ctx.controller, `${name(state, srcU.id)} captures ${name(state, t.id)}${op.income ? ` — the warrant pays ${op.income}/round while held` : ''}`)
        break
      }
    }
    stateBasedCleanup(state, ctx.actorSeat)
  }
}

/** A unit leaves play (death — #54, or capture — #112): its upgrades drop in the zone it held.
 *  v3 (decision 67): if `upgradesOrphan`, the gear stays on the field, salvageable; otherwise it
 *  goes to the owner's discard. The single choke point so death and capture shed identically —
 *  call it BEFORE removing the unit, while `unit.zone` still reads the drop zone. */
export function shedUpgrades(state: GameState, unit: UnitInstance, taken = false) {
  for (const upId of unit.upgrades) {
    const up = state.upgrades[upId]
    if (!up) continue
    // #122 (Silence the Song): the host's DEATH — not a capture (`taken`) — fires the upgrade's
    // on-host-death trigger. The ops run for the UPGRADE's owner (the caster who played it), NOT the
    // host's owner: brand your own unit or the enemy's, and when it falls YOU draw. Fired before the
    // gear orphans; the host is already off the field, so a bare `draw` reads the caster cleanly.
    if (!taken) {
      const hostDeathOps = defOf(state, upId).onHostDeath
      if (hostDeathOps?.length) runOps({ state, controller: up.owner, sourceUnit: unit.id, actorSeat: up.owner }, hostDeathOps)
    }
    // #122 (Wither): a curse marked consumedOnHostDeath does NOT orphan when its HOST dies — it is
    // discarded with the body (a rot curse shouldn't outlive its victim and jump to a fresh one).
    // (Destroying the curse mid-life is separate — that leaves the perm −1/−1 mods already stamped
    // on the host intact; only the future ticks stop.) Capture (`taken`) is not death, so it still
    // follows the standard decision-67 orphan path.
    const consumedWithHost = !taken && defOf(state, upId).attach?.consumedOnHostDeath
    if (state.rules.upgradesOrphan && !consumedWithHost) {   // v3 (decision 67): the wearer's gear stays on the field
      up.attachedTo = null
      up.orphanedIn = unit.zone
      log(state, up.owner, taken                // #112: capture drops gear in the prior zone, same as a fall
        ? `${name(state, upId)} is left behind as ${name(state, unit.id)} is taken`
        : `${name(state, upId)} lies where ${name(state, unit.id)} fell`)
    } else {
      state.sides[up.owner].discard.push(upId); delete state.upgrades[upId]
      if (consumedWithHost) log(state, up.owner, `${name(state, upId)} rots away with ${name(state, unit.id)}`)
    }
  }
  unit.upgrades = []
}

export function destroyUnit(state: GameState, unit: UnitInstance, why: string) {
  if (!state.units[unit.id]) return
  // #85 (Aura of Resolve): the per-round death ledger. Counted here — the single choke point every
  // death flows through (combat, effects, state-based, doom, and the created-copy vanish below) —
  // by OWNER seat, exactly once per death (the guard above blocks the re-entrant double-count).
  state.deaths[unit.owner] += 1
  // PR #54 (onDeath): last words. The body leaves play FIRST — ops run over a state where the
  // unit is already gone, so the op-tail cleanup can't re-enter this death and recurse.
  // actorSeat attribution uses the owner (win-tie edge; today's onDeath ops are influence-only).
  const deathOps = unit.imprisoned ? undefined : defOf(state, unit.id).onDeath
  delete state.units[unit.id]
  if (deathOps?.length) {
    // #107: the body is already off the field, so snapshot the trade flag into the context (an
    // onDeath `ifKilled` op can no longer read justKilled off state.units — the unit is gone).
    runOps({ state, controller: unit.owner, sourceUnit: unit.id, actorSeat: unit.owner, sourceKilled: !!unit.justKilled }, deathOps)
  }
  // v3 Capture: the capturer leaving play frees its captives — READY (decision 73, reverses 61)
  for (const [cid, c] of Object.entries(state.captives)) {
    if (c.by !== unit.id) continue
    c.unit.zone = unit.zone
    c.unit.exhausted = false
    c.unit.enteredRound = state.round
    state.units[cid] = c.unit
    delete state.captives[cid]
    log(state, c.unit.owner, `${name(state, cid)} is freed as ${name(state, unit.id)} falls`)
  }
  shedUpgrades(state, unit)
  delete state.units[unit.id]
  if (unit.created) {
    // #69: created copies were never deck cards — no discard pile, no deck, no trace
    log(state, unit.owner, `${name(state, unit.id)} is ${why} — the copy vanishes`)
    delete state.cardOf[unit.id]
    return
  }
  state.sides[unit.owner].discard.push(unit.id)
  log(state, unit.owner, `${name(state, unit.id)} is ${why}`)
}

/** Deaths → prison releases → win check. Run after every batch of changes. */
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
  // decision 104: influence is an uncapped value — it is never clamped to the win band.
  // Only checkWin ends the game (influence at/beyond threshold, or a base at/below 0 life).
  checkWin(state, actorSeat)
}

/** Fire a unit-trigger key with an existing context; imprisoned sources are inert. */
export function fireTrigger(
  ctx: Omit<FxCtx, 'controller' | 'sourceUnit'>,
  unit: UnitInstance,
  key: 'onPlay' | 'onEnterZone' | 'onAttack' | 'onAttackBase' | 'onDefend' | 'onKill',
) {
  if (unit.imprisoned) return
  // #107 (Flameblade Raider): mark the killer the instant it fells a unit — before any cleanup fires
  // onDeath — so a trade (it dies dealing the lethal blow) reads as a kill. True even when the unit
  // itself carries no onKill op (the combat code still fires onKill for every killer). Window advance
  // clears it, so it never leaks into a later, unrelated death.
  if (key === 'onKill') unit.justKilled = true
  const run = (ops: Op[] | undefined, sourceUnit: string, controller: Seat) => {
    if (!ops?.length) return
    runOps({ ...ctx, controller, sourceUnit }, ops)
  }
  run(defOf(ctx.state, unit.id)[key], unit.id, unit.owner)
  for (const upId of unit.upgrades) run(defOf(ctx.state, upId)[key], unit.id, unit.owner)
}
