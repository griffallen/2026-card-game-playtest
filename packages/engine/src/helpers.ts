import type {
  CardDef, Cond, GameState, KeywordName, Mod, Seat, Static, UnitInstance, ZoneId,
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
  state.log.push({ t: state.turn, seat, msg })
  if (state.log.length > 300) state.log.splice(0, state.log.length - 300)
}

/** Influence from a seat's perspective (+ = toward that seat's win). */
export function influenceFor(state: GameState, seat: Seat): number {
  const v = seat === 0 ? state.influence : -state.influence
  return v === 0 ? 0 : v // normalize -0
}

export function addInfluence(state: GameState, seat: Seat, n: number) {
  if (n === 0) return
  state.influence += seat === 0 ? n : -n
  const [t0, t1] = thresholds(state)
  state.influence = Math.max(-t1, Math.min(t0, state.influence))
}

/** Units sorted by instance id for deterministic iteration. */
export function unitsOf(state: GameState, seat?: Seat): UnitInstance[] {
  const all = Object.values(state.units)
    .filter(u => seat === undefined || u.owner === seat)
  return all.sort((a, b) => idNum(a.id) - idNum(b.id))
}

export const unitsInZone = (state: GameState, zone: ZoneId, seat?: Seat) =>
  unitsOf(state, seat).filter(u => u.zone === zone)

export function condHolds(state: GameState, owner: Seat, cond: Cond | undefined): boolean {
  if (!cond) return true
  const inf = influenceFor(state, owner)
  if (cond.influenceAtLeast !== undefined && inf < cond.influenceAtLeast) return false
  if (cond.influenceAtMost !== undefined && inf > cond.influenceAtMost) return false
  if (cond.selfLifeAtMost !== undefined && state.sides[owner].life > cond.selfLifeAtMost) return false
  return true
}

interface AuraGrant { p: number; armor: number; kws: { k: KeywordName; n?: number }[] }

/** Collect aura contributions applying to `unit` from all in-play sources (imprisoned sources are inert). */
function aurasFor(state: GameState, unit: UnitInstance): AuraGrant {
  const acc: AuraGrant = { p: 0, armor: 0, kws: [] }
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
    acc.armor += st.armor ?? 0
    if (st.kw) acc.kws.push(st.kw)
  }
  for (const anchor of unitsOf(state)) {
    if (anchor.imprisoned) continue
    for (const st of defOf(state, anchor.id).statics ?? []) apply(st, anchor)
    for (const upId of anchor.upgrades) {
      for (const st of defOf(state, upId).statics ?? []) if (!(st.s === 'aura' && st.scope === 'attached')) apply(st, anchor)
    }
  }
  return acc
}

/** Static grants a unit receives from its own attached upgrades. */
function upgradeGrants(state: GameState, unit: UnitInstance): AuraGrant {
  const acc: AuraGrant = { p: 0, armor: 0, kws: [] }
  for (const upId of unit.upgrades) {
    for (const st of defOf(state, upId).statics ?? []) {
      if (st.s === 'aura' && st.scope === 'attached') {
        acc.p += st.p ?? 0
        acc.armor += st.armor ?? 0
        if (st.kw) acc.kws.push(st.kw)
      }
    }
  }
  return acc
}

function activeMods(state: GameState, unit: UnitInstance): Mod[] {
  return unit.mods.filter(m => condHolds(state, unit.owner, m.cond))
}

export function effPower(state: GameState, unit: UnitInstance): number {
  const base = defOf(state, unit.id).power ?? 0
  const mods = activeMods(state, unit)
  const add = mods.reduce((s, m) => s + (m.p ?? 0), 0)
  const up = upgradeGrants(state, unit)
  const aura = aurasFor(state, unit)
  let p = base + add + up.p + aura.p
  if (mods.some(m => m.double)) p *= 2
  return Math.max(0, p)
}

export function effHealth(state: GameState, unit: UnitInstance): number {
  const base = defOf(state, unit.id).health ?? 0
  return Math.max(0, base + activeMods(state, unit).reduce((s, m) => s + (m.h ?? 0), 0))
}

export function effArmor(state: GameState, unit: UnitInstance): number {
  const own = (defOf(state, unit.id).kw ?? []).filter(k => k.k === 'armor').reduce((s, k) => s + (k.n ?? 0), 0)
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
  for (const spec of defOf(state, unit.id).kw ?? []) consider(spec)
  for (const m of activeMods(state, unit)) consider(m.kw)
  for (const spec of upgradeGrants(state, unit).kws) consider(spec)
  for (const spec of aurasFor(state, unit).kws) consider(spec)
  if (!has) return false
  return values.length ? Math.max(...values) : true
}

export const hasKw = (state: GameState, unit: UnitInstance, k: KeywordName) => kwOf(state, unit, k) !== false

/** Win thresholds per seat, with oppThreshold statics applied (a seat's own statics raise the OPPONENT's bar). */
export function thresholds(state: GameState): [number, number] {
  const t: [number, number] = [state.rules.influenceWinThreshold, state.rules.influenceWinThreshold]
  for (const u of unitsOf(state)) {
    if (u.imprisoned) continue
    for (const st of defOf(state, u.id).statics ?? []) {
      if (st.s === 'oppThreshold') t[other(u.owner)] += st.n
    }
  }
  return t
}

export function isSick(state: GameState, unit: UnitInstance): boolean {
  if (!state.rules.summoningSickness) return false
  return unit.enteredTurn === state.turn && !hasKw(state, unit, 'rush')
}

export function draw(state: GameState, seat: Seat, n: number) {
  const side = state.sides[seat]
  for (let i = 0; i < n; i++) {
    const id = side.deck.pop()
    if (!id) {
      // decision 33: every card that fails to appear costs life and influence
      side.life -= state.rules.emptyDrawLifeLoss
      addInfluence(state, seat, -state.rules.emptyDrawInfluenceLoss)
      log(state, seat, `${side.name}'s deck is empty — the missing card costs ${state.rules.emptyDrawLifeLoss} life and ${state.rules.emptyDrawInfluenceLoss} influence (${Math.max(0, side.life)} life)`)
      continue
    }
    side.hand.push(id)
  }
}

/** Life check then influence check, per game-rules §1.12. */
export function checkWin(state: GameState, actorSeat: Seat) {
  if (state.winner !== null) return
  const dead0 = state.sides[0].life <= 0
  const dead1 = state.sides[1].life <= 0
  if (dead0 || dead1) {
    let w: Seat
    if (dead0 && dead1) {
      const tb = state.rules.simultaneousLifeTiebreak
      w = tb === 'active' ? state.activeSeat : actorSeat
    } else w = dead0 ? 1 : 0
    state.winner = w
    state.winReason = 'life'
    log(state, w, `${state.sides[w].name} wins — opponent's life reached 0`)
    return
  }
  const [t0, t1] = thresholds(state)
  if (state.influence >= t0 || -state.influence >= t1) {
    const w: Seat = state.influence >= t0 ? 0 : 1
    state.winner = w
    state.winReason = 'influence'
    log(state, w, `${state.sides[w].name} wins — influence reached ${Math.abs(state.influence)}`)
  }
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
  if (seen.size !== Object.keys(state.cardOf).length)
    throw new EngineError('conservation', `${seen.size} placed vs ${Object.keys(state.cardOf).length} known`)
}
