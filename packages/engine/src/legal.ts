import type { GameAction, GameState, Seat, TargetRef, TargetSpec, UnitInstance, ZoneId } from './types.ts'
import { ZONES, adjacent, homeZone } from './types.ts'
import { choosesEntryExhaust, condHolds, defOf, effHealth, effPower, entryExhaustTargets, hasKw, idNum, isSick, kwOf, moveDamageCap, other, pipGateSatisfied, satisfiesAnyOf, unitsInZone, unitsOf } from './helpers.ts'
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

  if (state.phase === 'choose') {
    // #122 (pick-from-hand): one resolveChoice per card in the LIVE hand of the front entry's seat.
    // The queue only ever holds entries for seats that had a card at enqueue time, so this is never
    // empty for the actor — the sim can always answer (no 'stuck'); exactly 1 card → a forced pick.
    const entry = state.pendingChoices[0]
    if (!entry || seat !== entry.seat) return []
    for (const card of state.sides[seat].hand) out.push({ type: 'resolveChoice', card })
    return out
  }

  if (state.phase === 'block') {
    const pa = state.pendingAttack
    if (!pa || seat !== other(pa.seat)) return []
    const zone = pa.target.kind === 'unit' ? state.units[pa.target.id]?.zone
      : pa.target.kind === 'base' ? homeZone(pa.target.seat) : undefined  // attacks only ever target unit|base
    const candidates = unitsOf(state, seat).filter(u => u.zone === zone && !u.exhausted)
    const out2: GameAction[] = [{ type: 'block', pairs: [] }]
    // issue #50 (duel law): a lone attacker is answered by at most ONE Guard — full redirect.
    // decision 100: the Home is everyone's to defend — base attacks keep the open window
    const duel = state.rules.singleAttackerDuels && pa.target.kind === 'unit'
      && pa.attackers.filter(a => state.units[a]).length === 1
    if (duel) {
      const a = pa.attackers.find(x => state.units[x])!
      for (const b of candidates) if (hasKw(state, b, 'guard')) out2.push({ type: 'block', pairs: [{ blocker: b.id, onto: a }] })
      return out2
    }
    for (const b of candidates) for (const a of pa.attackers) {
      if (state.units[a]) out2.push({ type: 'block', pairs: [{ blocker: b.id, onto: a }] })
    }
    if (candidates.length > 1 && pa.attackers.length) {
      const first = pa.attackers.find(a => state.units[a])
      if (first) out2.push({ type: 'block', pairs: candidates.map(b => ({ blocker: b.id, onto: first })) })
    }
    return out2
  }

  if (state.phase === 'intercept') {
    const pa = state.pendingAttack
    if (!pa || seat !== other(pa.seat)) return []
    const out2: GameAction[] = [{ type: 'declineIntercept' }]
    for (const u of interceptCandidates(state, pa)) out2.push({ type: 'intercept', unit: u.id })
    return out2
  }

  if (state.phase === 'splash') {
    // #128 (Breakthrough chain): the defender places the leftover on any of their in-zone bodies
    // (exhaustion doesn't matter — it's not a block), or their base in their Home. Always non-empty
    // for the actor: the phase only opened because at least one such target existed.
    const ps = state.pendingSplash
    if (!ps || seat !== other(ps.seat)) return []
    const out2: GameAction[] = []
    for (const u of unitsInZone(state, ps.zone, seat)) out2.push({ type: 'splash', target: { kind: 'unit', id: u.id } })
    if (ps.zone === homeZone(seat)) out2.push({ type: 'splash', target: { kind: 'base', seat } })
    return out2
  }

  out.push({ type: 'pass' })
  if (!state.claimedThisRound) out.push({ type: 'claimInitiative' })
  const ready = state.sides[seat].resources.filter(r => !r.exhausted).length

  // plays (both windows). #122 (Eclipse): a locked seat plays NOTHING from hand this round — the
  // single gate. Everything below (moves, activate/Sneak, attacks, claim, pass) stays untouched.
  if (!state.cardPlayLock[seat]) for (const card of state.sides[seat].hand) {
    const def = defOf(state, card)
    if (!def.xCost && def.cost > ready) continue
    if (!pipGateSatisfied(state, seat, def)) continue
    if (def.xCost) {   // issue #45: one play per affordable X per target combo
      for (const targets of enumerateTargets(state, seat, card)) {
        for (let x = 0; x <= ready; x++) {
          out.push(targets.length ? { type: 'play', card, targets, x } : { type: 'play', card, x })
        }
      }
      continue
    }
    const infiltrates = def.type === 'unit' && (def.kw ?? []).some(k => k.k === 'infiltrate')
    const sentry = def.type === 'unit' && (def.kw ?? []).some(k => k.k === 'sentry')
    if (def.modes) {  // v3 modal cards: each mode enumerates with its own targets
      def.modes.forEach((mode, mi) => {
        if (!condHolds(state, seat, mode.cond)) return   // #87: a gated mode is not offered until its condition holds
        for (const targets of enumerateTargetSpecs(state, seat, mode.targets ?? [])) {
          out.push(targets.length ? { type: 'play', card, mode: mi, targets } : { type: 'play', card, mode: mi })
        }
      })
      continue
    }
    if (def.type === 'unit' && choosesEntryExhaust(def)) {
      // #104 (Lawbringer): the entry-arrest target is the player's choice. These units deploy to
      // their Home (no Infiltrate), so enumerate one play per eligible enemy standing there — or a
      // plain play (no arrest) when the Home holds none. Mandatory when one is available: the player
      // chooses WHICH enemy, not WHETHER to arrest (mirrors the old auto-pick's always-fires).
      const picks = entryExhaustTargets(state, seat, homeZone(seat))
      if (picks.length) for (const p of picks) out.push({ type: 'play', card, exhaust: p.id })
      else out.push({ type: 'play', card })
      continue
    }
    for (const targets of enumerateTargets(state, seat, card)) {
      if (!sentry) out.push(targets.length ? { type: 'play', card, targets } : { type: 'play', card })
      if (sentry) {
        out.push(targets.length ? { type: 'play', card, targets, zone: 1 } : { type: 'play', card, zone: 1 })
      } else if (infiltrates) for (const z of ZONES) {
        if (z === homeZone(seat)) continue   // the default deploy, already emitted
        out.push(targets.length ? { type: 'play', card, targets, zone: z } : { type: 'play', card, zone: z })
      }
    }
  }

  // moves — both players act in their own windows now (decision 40; no active-player gate)
  for (const unit of unitsOf(state, seat)) {
    if (unit.exhausted || isSick(state, unit) || hasKw(state, unit, 'sentry')) continue
    const zones = ZONES.filter(z => adjacent(z, unit.zone))
    // #104 (Lawbringer): a unit that arrests a CHOSEN enemy on entry expands each destination into
    // one move per eligible enemy waiting there (a plain move when none) — the same choose-which-not-
    // whether rule as its play, now against the destination zone.
    const chooses = choosesEntryExhaust(defOf(state, unit.id))
    for (const to of zones) {
      // A ready enemy Sentry holds this zone's approach to its controller's Home. Card effects
      // can still move a unit; this only removes the ordinary move action.
      if (unitsInZone(state, unit.zone, other(seat)).some(s =>
        !s.exhausted && hasKw(state, s, 'sentry') && to === homeZone(s.owner))) continue
      const picks = chooses ? entryExhaustTargets(state, seat, to) : []
      if (picks.length) for (const p of picks) out.push({ type: 'move', unit: unit.id, to, exhaust: p.id })
      else out.push({ type: 'move', unit: unit.id, to })
    }
  }

  // v3 Sneak: exhaust-activated abilities (decision 60)
  for (const u of unitsOf(state, seat)) {
    if (u.exhausted) continue
    const def = defOf(state, u.id)
    if (!def.sneak || !(def.kw ?? []).some(k => k.k === 'sneak')) continue
    const specs = def.sneak.targets ?? []
    if (!specs.length) { out.push({ type: 'activate', unit: u.id }); continue }
    const spec = specs[0]
    if (spec.t === 'unit' || spec.t === 'unitOrBase') {
      const sides: Seat[] = spec.side === 'friendly' ? [seat] : spec.side === 'any' ? [seat, other(seat)] : [other(seat)]
      for (const sd of sides) for (const t of unitsInZone(state, u.zone, sd)) {
        if (t.owner !== seat && !t.exhausted && hasKw(state, t, 'hidden')) continue
        out.push({ type: 'activate', unit: u.id, targets: [{ kind: 'unit', id: t.id }] })
      }
      if (spec.t === 'unitOrBase' && u.zone === homeZone(other(seat))) {
        out.push({ type: 'activate', unit: u.id, targets: [{ kind: 'base', seat: other(seat) }] })
      }
    }
  }
  // v3 Ranged (decision 80): exhaust to volley N at one enemy unit, any zone
  if (state.rules.combatModel === 'blockerPairing') {
    for (const u of unitsOf(state, seat)) {
      if (u.exhausted) continue
      if (typeof kwOf(state, u, 'ranged') !== 'number') continue
      for (const t of unitsOf(state, other(seat))) {
        if (!t.exhausted && hasKw(state, t, 'hidden')) continue   // decision 76: a volley chooses
        out.push({ type: 'activate', unit: u.id, targets: [{ kind: 'unit', id: t.id }] })
      }
    }
  }
  // #104 (Censer of Purity): activated move-damage ability — exhaust to draw a friendly unit's wounds.
  // One legal action per (damaged ally, amount) pair; the amount runs 1..cap where cap = min(the ally's
  // damage, this unit's remaining Health). A full or exhausted unit, or one with no damaged ally, offers
  // nothing. This is the engine's only free-numeric activated ability — the demo renders it as a picker.
  for (const u of unitsOf(state, seat)) {
    if (u.exhausted) continue
    const def = defOf(state, u.id)
    if (!def.activated) continue
    if (effHealth(state, u) - u.damage <= 0) continue   // a full body can absorb nothing more
    for (const f of unitsOf(state, seat)) {
      if (f.id === u.id || f.damage <= 0) continue
      const cap = moveDamageCap(state, f, u)
      for (let amt = 1; amt <= cap; amt++) {
        out.push({ type: 'activate', unit: u.id, targets: [{ kind: 'unit', id: f.id }], amount: amt })
      }
    }
  }

  // v3 (decision 67): salvage orphaned upgrades in reach
  const readyRes = state.sides[seat].resources.filter(r => !r.exhausted).length
  for (const up of Object.values(state.upgrades)) {
    if (up.attachedTo !== null || up.orphanedIn === undefined) continue
    const def = defOf(state, up.id)
    if (def.attach?.salvage === 'freeFriendly') {
      // #86 (Resolve Banner): only the banner's OWNER may recover it, for free — enemies see nothing
      if (seat !== up.owner) continue
      for (const u of unitsInZone(state, up.orphanedIn, seat)) out.push({ type: 'attachOrphan', upgrade: up.id, unit: u.id })
      continue
    }
    if (def.cost > readyRes || !pipGateSatisfied(state, seat, def)) continue
    // #80/#122: salvage the way it plays — friendly onto your own, enemy onto hostile carriers
    // (protected excepted), any onto either (protections applying only to the enemy's).
    const salvageSide = def.attach?.side ?? 'friendly'
    const hostileOk = (u: UnitInstance) => !(!u.exhausted && hasKw(state, u, 'hidden'))
    const pool = salvageSide === 'friendly'
      ? unitsInZone(state, up.orphanedIn, seat)
      : salvageSide === 'enemy'
        ? unitsInZone(state, up.orphanedIn, other(seat)).filter(hostileOk)
        : unitsInZone(state, up.orphanedIn).filter(u => u.owner === seat || hostileOk(u))   // #122: side 'any'
    for (const u of pool) {
      out.push({ type: 'attachOrphan', upgrade: up.id, unit: u.id })
    }
  }
  // #86 (Resolve Banner): pass an attached, passable upgrade to another friendly unit in its zone
  for (const up of Object.values(state.upgrades)) {
    const cost = defOf(state, up.id).attach?.pass
    if (cost === undefined || up.attachedTo === null || up.owner !== seat) continue
    const carrier = state.units[up.attachedTo]
    if (!carrier || carrier.owner !== seat || cost > readyRes) continue
    for (const u of unitsInZone(state, carrier.zone, seat)) {
      if (u.id === carrier.id) continue
      out.push({ type: 'passUpgrade', upgrade: up.id, unit: u.id })
    }
  }

  // attacks (decision 42): each ready unit alone, plus one full-group per (zone, shared target). No guard-forcing.
  const attackers = unitsOf(state, seat).filter(u => !u.exhausted && !isSick(state, u) && !hasKw(state, u, 'cantAttack') && !hasKw(state, u, 'sentry'))
  // PR #46 (splashReap): a chosen-splash attacker declares its victim with the attack — one
  // action variant per victim combination (decision 24: everything is declared up front)
  const withSplash = (a: Extract<GameAction, { type: 'attack' }>): GameAction[] => {
    if (a.target.kind !== 'unit') return [a]
    const tgtId = a.target.id
    const tgt = state.units[tgtId]!
    const splashers = a.attackers.filter(id => (defOf(state, id).onAttack ?? []).some(o => o.op === 'splashReap'))
    if (!splashers.length) return [a]
    let combos: { by: string; unit: string }[][] = [[]]
    for (const sid of splashers) {
      const cands = unitsInZone(state, tgt.zone).filter(u =>
        u.id !== tgtId && u.id !== sid && !(u.owner !== seat && !u.exhausted && hasKw(state, u, 'hidden')))
      if (!cands.length) continue
      combos = combos.flatMap(cur => cands.map(v => [...cur, { by: sid, unit: v.id }]))
    }
    return combos.map(sp => (sp.length ? { ...a, splash: sp } : a))
  }
  const byZone = new Map<ZoneId, UnitInstance[]>()
  for (const u of attackers) byZone.set(u.zone, [...(byZone.get(u.zone) ?? []), u])
  for (const [, group] of byZone) {
    const targetsHere = new Map<string, TargetRef>()
    for (const u of group) for (const t of attackTargets(state, u)) targetsHere.set(JSON.stringify(t), t)
    for (const t of targetsHere.values()) {
      const able = group.filter(u => attackTargets(state, u).some(x => JSON.stringify(x) === JSON.stringify(t)))
      for (const u of able) out.push(...withSplash({ type: 'attack', attackers: [u.id], target: t }))
      if (able.length > 1) {
        const ids = able.map(u => u.id)
        out.push(...withSplash({ type: 'attack', attackers: ids, target: t }))
      }
    }
  }
  return out
}

function attackTargets(state: GameState, attacker: UnitInstance): TargetRef[] {
  const seat = attacker.owner
  const enemy = other(seat)
  // decision 80: v3 Ranged is an ability, not an attack style — its ATTACKS are ordinary.
  // The sniper-shot semantics (cross-zone reach, base ban) survive only in classic v2.3.
  const legacy = state.rules.combatModel === 'intercept'
  const ranged = legacy && hasKw(state, attacker, 'ranged')
  const out: TargetRef[] = []

  const zonesInReach: ZoneId[] = [attacker.zone]
  if (ranged) for (const z of ZONES) if (adjacent(z, attacker.zone)) zonesInReach.push(z)

  for (const zone of zonesInReach) {
    for (const d of unitsInZone(state, zone, enemy)) {
      // v3 Hidden (decision 59): ready hidden units aren't legal attack targets
      if (!d.exhausted && hasKw(state, d, 'hidden')) continue
      out.push({ kind: 'unit', id: d.id })
    }
  }

  // base: standing in the enemy home zone; the v2.3 ranged ban applies only there (decision 80)
  if (!ranged && attacker.zone === homeZone(enemy)
    && !unitsInZone(state, homeZone(enemy), enemy).some(u => !u.exhausted && hasKw(state, u, 'sentry'))) {
    out.push({ kind: 'base', seat: enemy })
  }
  return out
}

/**
 * All target combinations for playing `card`.
 * Returns [[]] when the card needs no targets, [] when required targets don't exist.
 * Each slot contributes a list of choices; a choice is one-or-more refs (count-2 specs bundle pairs).
 */


/** v3: expand a multi-target spec into concrete combinations, honoring upTo (sizes 1..count)
 *  and sameZone (all unit refs share a zone). */
function multiCombos(state: GameState, spec: TargetSpec, candidates: TargetRef[], count: number): TargetRef[][] {
  const sizes = spec.upTo ? Array.from({ length: count }, (_, i) => i + 1) : [count]
  const out: TargetRef[][] = []
  for (const size of sizes) {
    const pick = (start: number, acc: TargetRef[]) => {
      if (acc.length === size) { out.push([...acc]); return }
      for (let i = start; i < candidates.length; i++) { acc.push(candidates[i]); pick(i + 1, acc); acc.pop() }
    }
    pick(0, [])
  }
  if (!spec.sameZone) return out
  return out.filter(refs => new Set(refs.filter(r => r.kind === 'unit').map(r => state.units[r.id]?.zone)).size <= 1)
}

/** v3 modal support: enumerate target combinations for a bare spec list (no card def involved). */
/** Decision 72 (adjacentToFirst): every zone ref must hug the first chosen unit's zone.
 *  (Applied whenever any spec carries the flag — no card mixes constrained and free zone targets.) */
function passesAdjacency(state: GameState, specs: TargetSpec[], combo: TargetRef[]): boolean {
  if (!specs.some(s => s.adjacentToFirst || s.differentFromFirst)) return true
  const first = combo.find(r => r.kind === 'unit')
  if (!first || first.kind !== 'unit') return false
  const u = state.units[first.id]
  if (!u) return false
  return combo.every((r, i) => {
    if (r.kind !== 'zone') return true
    const spec = specs[i]
    if (spec?.adjacentToFirst && !adjacent(r.zone, u.zone)) return false
    if (spec?.differentFromFirst && r.zone === u.zone) return false
    return true
  })
}

function enumerateTargetSpecs(state: GameState, seat: Seat, specs: TargetSpec[]): TargetRef[][] {
  if (!specs.length) return [[]]
  const slotChoices: TargetRef[][][] = []
  for (const spec of specs) {
    const candidates = candidatesFor(state, seat, spec)
    const count = spec.count ?? 1
    if (candidates.length < (spec.upTo ? 1 : count)) return []
    if (count === 1) slotChoices.push(candidates.map(c => [c]))
    else slotChoices.push(multiCombos(state, spec, candidates, count))
  }
  let acc: TargetRef[][] = [[]]
  for (const choices of slotChoices) {
    const next: TargetRef[][] = []
    for (const a of acc) for (const c of choices) next.push([...a, ...c])
    acc = next
  }
  return acc.filter(c => passesAdjacency(state, specs, c))
}

function enumerateTargets(state: GameState, seat: Seat, card: string): TargetRef[][] {
  const def = defOf(state, card)
  const slotChoices: TargetRef[][][] = []

  if (def.type === 'upgrade') {
    // #80/#122: enumerate legal carriers. friendly → your own units; enemy → hostile carriers
    // minus the protected (ready Hidden, decision 59); any → both, protections
    // applying only to the enemy's. Mirrors playCard's gate exactly.
    const side = def.attach?.side ?? 'friendly'
    const hostileOk = (u: UnitInstance) => !(!u.exhausted && hasKw(state, u, 'hidden'))
    const carriers = side === 'friendly'
      ? unitsOf(state, seat)
      : side === 'enemy'
        ? unitsOf(state, other(seat)).filter(hostileOk)
        : unitsOf(state).filter(u => u.owner === seat || hostileOk(u))   // #122: side 'any'
    if (!carriers.length) return []
    slotChoices.push(carriers.map(u => [{ kind: 'unit', id: u.id } as TargetRef]))
  }

  for (const spec of def.targets ?? []) {
    const candidates = candidatesFor(state, seat, spec)
    const count = spec.count ?? 1
    if (candidates.length < (spec.upTo ? 1 : count)) return []
    if (count === 1) {
      slotChoices.push(candidates.map(c => [c]))
    } else {
      slotChoices.push(multiCombos(state, spec, candidates, count))
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
  return combos.filter(c => passesAdjacency(state, def.targets ?? [], c))
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
    if (spec.maxCost !== undefined && defOf(state, u.id).cost > spec.maxCost) continue
    if (spec.anyOf && !satisfiesAnyOf(state, u, spec.anyOf)) continue   // #104 (Inquisitor): OR of power/cost/remaining-health caps
    if (spec.damagedOrMaxHealth !== undefined && u.damage <= 0 && effHealth(state, u) > spec.damagedOrMaxHealth) continue
    if (spec.withKw && !hasKw(state, u, spec.withKw)) continue
    if (spec.mustBeDamaged && u.damage <= 0) continue
    if (u.owner !== seat && !u.exhausted && hasKw(state, u, 'hidden')) continue   // v3 (decision 59)
    out.push({ kind: 'unit', id: u.id })
  }
  if (spec.t === 'unitOrBase') {
    const sides: Seat[] = (spec.baseSide ?? 'enemy') === 'any' ? [0, 1] : [other(seat)]
    for (const s of sides) out.push({ kind: 'base', seat: s })
  }
  return out
}
