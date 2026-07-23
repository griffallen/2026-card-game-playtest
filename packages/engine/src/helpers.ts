import type {
  BaseCount, CardDef, Color, Cond, GameState, KeywordName, KeywordSpec, Mod, Seat, Static, UnitInstance, ZoneId,
} from './types.ts'
import { EngineError } from './types.ts'

export const other = (s: Seat): Seat => (1 - s) as Seat
export const idNum = (id: string) => Number(id.slice(1))

export function defOf(state: GameState, instanceId: string): CardDef {
  const slug = state.cardOf[instanceId]
  const def = slug ? state.cardSet[slug] : undefined
  if (!def) throw new EngineError('unknown-card', `no definition for instance ${instanceId}`)
  return def
}

export function log(state: GameState, seat: Seat | null, msg: string) {
  state.log.push({ t: state.round, seat, msg })
  if (state.log.length > 300) state.log.splice(0, state.log.length - 300)
}

/** A seat's independent Hope score. */
export function hopeFor(state: GameState, seat: Seat): number {
  // Old recorded fixtures represent Hope as one signed value. Promote that value only while both
  // new tracks are untouched; live games always use the independent `hope` tuple.
  if (state.hope[0] === 0 && state.hope[1] === 0 && state.influence !== 0) {
    if (state.influence > 0) state.hope[0] = state.influence
    else state.hope[1] = -state.influence
  }
  const v = state.hope[seat]
  return v === 0 ? 0 : v // normalize -0
}

/** Change one player's Hope. Effects default to their controller/owner when they call this helper. */
export function addHope(state: GameState, seat: Seat, n: number) {
  if (n === 0) return
  // Hope is uncapped — only checkWin ends the game.
  state.hope[seat] += n
  state.influence = state.hope[0] - state.hope[1]
}

/** @deprecated Use hopeFor. Retained while existing card data uses `influence` operation names. */
export const influenceFor = hopeFor
/** @deprecated Use addHope. Retained while existing card data uses `influence` operation names. */
export const addInfluence = addHope

/** Units sorted by instance id for deterministic iteration. */
export function unitsOf(state: GameState, seat?: Seat): UnitInstance[] {
  const all = Object.values(state.units)
    .filter(u => seat === undefined || u.owner === seat)
  return all.sort((a, b) => idNum(a.id) - idNum(b.id))
}

export const unitsInZone = (state: GameState, zone: ZoneId, seat?: Seat) =>
  unitsOf(state, seat).filter(u => u.zone === zone)

/** #107 (Last Stand): true while this seat has an active pact — its units don't exhaust from acting. */
export const hasLastStand = (state: GameState, seat: Seat): boolean =>
  state.lastStands.some(ls => ls.seat === seat)

/** #104 (Lawbringer): does this card arrest a player-CHOSEN enemy when it enters a zone? True when its
 *  onEnterZone carries an `exhaust` op with `auto.choose` — the entering player picks which enemy. */
export const choosesEntryExhaust = (def: CardDef): boolean =>
  (def.onEnterZone ?? []).some(o => o.op === 'exhaust' && o.t === 'auto' && !!o.auto?.choose)

/** #104 (Lawbringer): enemy units in `zone` that a chosen entry-exhaust may arrest — READY (a down
 *  unit is a wasted arrest, matching the auto-pick) and not shielded by
 *  ready-Hidden (a player CHOICE is targeting, so the standing protections apply).
 *  Empty = no legal target, so the play/move happens with no arrest (a clean no-op). */
export function entryExhaustTargets(state: GameState, controller: Seat, zone: ZoneId): UnitInstance[] {
  return unitsInZone(state, zone, other(controller)).filter(u =>
    !u.exhausted
    && !(!u.exhausted && hasKw(state, u, 'hidden')))
}

/** #104 (Inquisitor): does the unit satisfy ANY of the OR-caps — effective Power ≤ maxPower,
 *  printed Cost ≤ maxCost, or remaining Health (effHealth − damage) ≤ maxRemainingHealth? */
export function satisfiesAnyOf(
  state: GameState, unit: UnitInstance,
  anyOf: { maxPower?: number; maxCost?: number; maxRemainingHealth?: number },
): boolean {
  if (anyOf.maxPower !== undefined && effPower(state, unit) <= anyOf.maxPower) return true
  if (anyOf.maxCost !== undefined && defOf(state, unit.id).cost <= anyOf.maxCost) return true
  if (anyOf.maxRemainingHealth !== undefined && effHealth(state, unit) - unit.damage <= anyOf.maxRemainingHealth) return true
  return false
}

export function condHolds(state: GameState, owner: Seat, cond: Cond | undefined): boolean {
  if (!cond) return true
  const inf = influenceFor(state, owner)
  if (cond.influenceAtLeast !== undefined && inf < cond.influenceAtLeast) return false
  if (cond.influenceAtMost !== undefined && inf > cond.influenceAtMost) return false
  if (cond.selfLifeAtMost !== undefined && state.sides[owner].life > cond.selfLifeAtMost) return false
  if (cond.selfLifeLessThanOpponent && state.sides[owner].life >= state.sides[other(owner)].life) return false
  return true
}

interface AuraGrant { p: number; setPower?: number; armor: number; h: number; kws: { k: KeywordName; n?: number }[] }

/** Collect aura contributions applying to `unit` from all in-play sources. */
function aurasFor(state: GameState, unit: UnitInstance): AuraGrant {
  const acc: AuraGrant = { p: 0, armor: 0, h: 0, kws: [] }
  const apply = (st: Static, anchor: UnitInstance) => {
    if (st.s !== 'aura') return
    if (!condHolds(state, anchor.owner, st.cond)) return
    const friendly = unit.owner === anchor.owner
    let hit = false
    if (st.scope === 'otherFriendly') hit = friendly && unit.id !== anchor.id
    else if (st.scope === 'friendlyInZone') hit = friendly && unit.id !== anchor.id && unit.zone === anchor.zone
    else if (st.scope === 'enemyInZone') hit = !friendly && unit.zone === anchor.zone
    if (!hit) return
    acc.p += st.p ?? 0
    if (st.setPower !== undefined) acc.setPower = st.setPower
    acc.armor += st.armor ?? 0
    acc.h += st.h ?? 0
    if (st.kw) acc.kws.push(st.kw)
  }
  for (const anchor of unitsOf(state)) {
    for (const st of defOf(state, anchor.id).statics ?? []) apply(st, anchor)
    for (const upId of anchor.upgrades) {
      for (const st of defOf(state, upId).statics ?? []) if (!(st.s === 'aura' && st.scope === 'attached')) apply(st, anchor)
    }
  }
  return acc
}

/** Static grants a unit receives from its own attached upgrades. */
function upgradeGrants(state: GameState, unit: UnitInstance): AuraGrant {
  const acc: AuraGrant = { p: 0, armor: 0, h: 0, kws: [] }
  for (const upId of unit.upgrades) {
    for (const st of defOf(state, upId).statics ?? []) {
      if (st.s === 'aura' && st.scope === 'attached') {
        // #107 (Bloodfrenzy): a conditional attached aura re-checks LIVE against the wearer's
        // controller — the bonus grows/shrinks as Influence swings, evaluated on every effPower/
        // effHealth read (no snapshot state). The wearer's owner is "you", matching aurasFor's
        // treatment of upgrade-granted auras (condHolds against the anchor/wearer owner).
        if (!condHolds(state, unit.owner, st.cond)) continue
        acc.p += st.p ?? 0
        if (st.setPower !== undefined) acc.setPower = st.setPower
        // #80 (Subjugate): ±1 power per pip in the CARRIER's cost — read live, so a salvaged
        // upgrade (decision 67) re-fits its new host; pips never change, so while attached
        // the value is permanent without any snapshot state.
        if (st.pPerHostPip) acc.p += st.pPerHostPip * (defOf(state, unit.id).pips?.length ?? 0)
        acc.armor += st.armor ?? 0
        acc.h += st.h ?? 0   // #86 (Resolve Banner): upgrade-granted Health, read live by effHealth
        if (st.kw) acc.kws.push(st.kw)
      }
    }
  }
  return acc
}

function activeMods(state: GameState, unit: UnitInstance): Mod[] {
  return unit.mods.filter(m => condHolds(state, unit.owner, m.cond))
}

/** The unit's printed keyword line — created copies (#69) may carry their own, replacing the card's. */
export const printedKw = (state: GameState, unit: UnitInstance): KeywordSpec[] =>
  unit.created?.kw ?? defOf(state, unit.id).kw ?? []

/** #122 (Umbral Colossus / The Unseen Court): a unit's base Power/Health read LIVE at query time from a
 *  board count — REPLACING the printed stat in effPower/effHealth (a created copy's own body still wins,
 *  and mods/auras/scar compose on top of whatever this returns). Owner-perspective and ctx-free: the
 *  unit knows its `owner`, both discards live on `state.sides`, and `defOf` resolves a discard instance
 *  id via cardOf. Deliberately NOT the effects.ts `perCount` (that is controller-perspective at
 *  resolution time). Array lengths are never negative and effPower/effHealth wrap in Math.max(0,…),
 *  so the 0 floor is free — no caching, the value tracks the board every read. */
export function baseCount(state: GameState, unit: UnitInstance, src: BaseCount): number {
  if (src === 'handSize') return state.sides[unit.owner].hand.length
  // 'discardUnitsBoth': unit cards across BOTH discard piles (units die into discard; actions/upgrades
  // are there too, so filter to type 'unit') — the Unseen Court's power grows as units fall.
  return [...state.sides[0].discard, ...state.sides[1].discard]
    .filter(id => defOf(state, id).type === 'unit').length
}

export function effPower(state: GameState, unit: UnitInstance): number {
  const def = defOf(state, unit.id)
  // #122: precedence — created copy → count → printed → 0. Only the base term changes; everything
  // downstream (mods, upgrades, auras, scar, the double multiply) composes on top unchanged.
  const base = unit.created?.p ?? (def.powerFromCount != null ? baseCount(state, unit, def.powerFromCount) : def.power ?? 0)
  const mods = activeMods(state, unit)
  const modSet = [...mods].reverse().find(m => m.setPower !== undefined)?.setPower
  const add = mods.reduce((s, m) => s + (m.p ?? 0), 0)
  const up = upgradeGrants(state, unit)
  const aura = aurasFor(state, unit)
  let p = aura.setPower ?? up.setPower ?? modSet ?? base
  p += add + up.p + aura.p
  // v3 Scar (decision 94, supersedes 70): +1 per damage marked — no cap, the wound is the fuel
  if (hasKw(state, unit, 'scar')) p += unit.damage
  if (mods.some(m => m.double)) p *= 2
  return Math.max(0, p)
}

export function effHealth(state: GameState, unit: UnitInstance): number {
  const def = defOf(state, unit.id)
  // #122: same precedence as effPower — created copy → count → printed → 0 (the base term only).
  const base = unit.created?.h ?? (def.healthFromCount != null ? baseCount(state, unit, def.healthFromCount) : def.health ?? 0)
  const mods = activeMods(state, unit).reduce((s, m) => s + (m.h ?? 0), 0)
  // #86 (Resolve Banner): attached upgrades and auras may grant Health, read live — so detaching
  // (a pass, a destroyed carrier) recomputes lethality on the next state-based cleanup.
  return Math.max(0, base + mods + upgradeGrants(state, unit).h + aurasFor(state, unit).h)
}

/** #104 (Censer of Purity): how much damage `to` can draw off `from` — min of the source's
 *  current damage and the sink's remaining Health (it cannot fall below 0). The Censer's moveDamage
 *  ability, its legal-action enumeration, and its picker all read the same cap through here. */
export function moveDamageCap(state: GameState, from: UnitInstance, to: UnitInstance): number {
  return Math.min(from.damage, Math.max(0, effHealth(state, to) - to.damage))
}

export function effArmor(state: GameState, unit: UnitInstance): number {
  const own = printedKw(state, unit).filter(k => k.k === 'armor').reduce((s, k) => s + (k.n ?? 0), 0)
  const mods = activeMods(state, unit).reduce((s, m) => s + (m.armor ?? 0) + (m.kw?.k === 'armor' ? m.kw.n ?? 0 : 0), 0)
  return own + mods + upgradeGrants(state, unit).armor + aurasFor(state, unit).armor
    + upgradeGrants(state, unit).kws.filter(k => k.k === 'armor').reduce((s, k) => s + (k.n ?? 0), 0)
    + aurasFor(state, unit).kws.filter(k => k.k === 'armor').reduce((s, k) => s + (k.n ?? 0), 0)
}

/** Does the unit currently have keyword `k`? Returns the max n for valued keywords, or true/false. */
export function kwOf(state: GameState, unit: UnitInstance, k: KeywordName): number | boolean {
  const values: number[] = []
  let has = false
  const consider = (spec: { k: KeywordName; n?: number } | undefined) => {
    if (!spec || spec.k !== k) return
    has = true
    if (spec.n !== undefined) values.push(spec.n)
  }
  for (const spec of printedKw(state, unit)) consider(spec)
  for (const m of activeMods(state, unit)) consider(m.kw)
  for (const spec of upgradeGrants(state, unit).kws) consider(spec)
  for (const spec of aurasFor(state, unit).kws) consider(spec)
  if (!has) return false
  return values.length ? Math.max(...values) : true
}

export const hasKw = (state: GameState, unit: UnitInstance, k: KeywordName) => kwOf(state, unit, k) !== false

/** A Tribune turns public standing into endurance: its controller gains 1 Life when it enters play
 * and loses 1 Life when it leaves. Capture is a leave; release is an entry. */
export function tribuneEnter(state: GameState, unit: UnitInstance) {
  if (!hasKw(state, unit, 'tribune')) return
  state.sides[unit.owner].life += 1
  log(state, unit.owner, `${defOf(state, unit.id).name} takes the floor (Tribune: +1 Life)`)
}
export function tribuneLeave(state: GameState, unit: UnitInstance) {
  if (!hasKw(state, unit, 'tribune')) return
  state.sides[unit.owner].life -= 1
  log(state, unit.owner, `${defOf(state, unit.id).name} yields the floor (Tribune: −1 Life)`)
}

/** Fixed Hope bands. Every player wins at +12 and loses at -12. */
export function thresholds(state: GameState): [number, number] {
  return [state.rules.hopeWinThreshold, state.rules.hopeWinThreshold]
}

export function isSick(state: GameState, unit: UnitInstance): boolean {
  if (!state.rules.summoningSickness) return false
  return unit.enteredRound === state.round && !hasKw(state, unit, 'rush')
}

export function draw(state: GameState, seat: Seat, n: number) {
  const side = state.sides[seat]
  for (let i = 0; i < n; i++) {
    const id = side.deck.pop()
    if (!id) {
      // decision 33: every card that fails to appear costs life and influence
      side.life -= state.rules.emptyDrawLifeLoss
      addInfluence(state, seat, -state.rules.emptyDrawInfluenceLoss)
      log(state, seat, `${side.name}'s deck is empty — the missing card costs ${state.rules.emptyDrawLifeLoss} life and ${state.rules.emptyDrawInfluenceLoss} Hope (${side.life} life)`)
      continue
    }
    side.hand.push(id)
  }
}

/** Check Life and independent Hope. If both players would win at once, the acting player wins. */
export function checkWin(state: GameState, actorSeat: Seat) {
  if (state.winner !== null) return
  const [t0, t1] = thresholds(state)
  const loss = [state.sides[0].life <= 0 || state.hope[0] <= -t0, state.sides[1].life <= 0 || state.hope[1] <= -t1] as const
  const hopeWin = [state.hope[0] >= t0, state.hope[1] >= t1] as const
  const wins = [hopeWin[0] || loss[1], hopeWin[1] || loss[0]] as const
  if (!wins[0] && !wins[1]) return
  const w: Seat = wins[0] && wins[1] ? actorSeat : wins[0] ? 0 : 1
  state.winner = w
  state.winReason = hopeWin[w] || state.hope[other(w)] <= -thresholds(state)[other(w)] ? 'hope' : 'life'
  const reason = state.winReason === 'hope' ? `Hope reached ${state.hope[w] >= thresholds(state)[w] ? state.hope[w] : state.hope[other(w)]}` : "opponent's life reached 0"
  log(state, w, `${state.sides[w].name} wins — ${reason}`)
}

/** Sim-mode invariant: every card instance lives in exactly one place. */
export function assertConservation(state: GameState) {
  const seen = new Map<string, string>()
  const put = (id: string, where: string) => {
    if (seen.has(id)) throw new EngineError('conservation', `${id} in ${where} and ${seen.get(id)}`)
    if (!state.cardOf[id]) throw new EngineError('conservation', `${id} has no slug`)
    seen.set(id, where)
  }
  state.sides.forEach((side, i) => {
    side.deck.forEach(id => put(id, `deck${i}`))
    side.hand.forEach(id => put(id, `hand${i}`))
    side.resources.forEach(r => put(r.id, `res${i}`))
    side.discard.forEach(id => put(id, `discard${i}`))
  })
  Object.values(state.units).forEach(u => put(u.id, 'play'))
  Object.values(state.upgrades).forEach(u => put(u.id, 'play'))
  Object.keys(state.captives).forEach(id => put(id, 'captive'))   // v3: under a capturer is still a place
  if (seen.size !== Object.keys(state.cardOf).length)
    throw new EngineError('conservation', `${seen.size} placed vs ${Object.keys(state.cardOf).length} known`)
}

/** Decision 69: pips gate plays on banked color PRESENCE (ready or exhausted) and never exhaust anything.
 *  A banked card provides 1 presence of each color in its own pips — same-color pips never stack. */
export function pipGateSatisfied(state: GameState, seat: Seat, def: CardDef): boolean {
  if (state.rules.pipModel !== 'presence' || !def.pips?.length) return true
  const need = new Map<Color, number>()
  for (const c of def.pips) need.set(c, (need.get(c) ?? 0) + 1)
  for (const [color, n] of need) {
    let have = 0
    for (const r of state.sides[seat].resources) {
      if (defOf(state, r.id).pips?.includes(color) && ++have >= n) break
    }
    if (have < n) return false
  }
  return true
}
