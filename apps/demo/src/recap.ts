// Combat recap composition (issue #100) — DEMO-LAYER ONLY, no engine behavior touched.
//
// The engine resolves a v3 duel (decision 84: everything hits back, always) and emits a stream
// of consequence lines — "X takes 5 from Y", "Y takes 3 from X", "X is destroyed". Read one by
// one they never spell out the *trade*: who hit whom, for how much each way, and who fell. This
// module reconstructs that trade for the recap overlay so a fight reads in one glance:
//
//   Berserker (3) ↔ Radiant Citadel (5): dealt 3, took 5 — Berserker falls
//
// It works purely from data the demo already has — the resolved attack (attackers + target from
// the pending attack, or the attack action itself), the pre-combat state (names, power via the
// engine's effPower), the post-combat state (who's gone), and the engine's own damage numbers
// parsed back out of the event lines (so armor/shields/caps stay exactly what the engine applied).
import { effPower, type GameAction, type GameState, type TargetRef } from '@newgame/engine'

// ---- event parsing --------------------------------------------------------
// The engine's combat vocabulary (packages/engine/src/effects.ts). We parse the numbers back out
// rather than recompute them, so the recap always matches what actually landed.
type Parsed =
  | { kind: 'unitDmg'; subject: string; amount: number; from: string }
  | { kind: 'baseDmg'; subject: string; amount: number; life: number }
  | { kind: 'shield'; subject: string }
  | { kind: 'shrug'; subject: string }
  | { kind: 'destroyed'; subject: string }
  | { kind: 'other' }

function parseEvent(msg: string): Parsed {
  let m = /^(.+) takes (\d+) damage from (.+) \((-?\d+) life\)$/.exec(msg)
  if (m) return { kind: 'baseDmg', subject: m[1], amount: +m[2], life: +m[4] }
  m = /^(.+) takes (\d+) damage from (.+)$/.exec(msg)
  if (m) return { kind: 'unitDmg', subject: m[1], amount: +m[2], from: m[3] }
  m = /^(.+)'s shield absorbs the blow$/.exec(msg)
  if (m) return { kind: 'shield', subject: m[1] }
  m = /^(.+) shrugs off the damage \(armor\)$/.exec(msg)
  if (m) return { kind: 'shrug', subject: m[1] }
  m = /^(.+) is destroyed$/.exec(msg)
  if (m) return { kind: 'destroyed', subject: m[1] }
  return { kind: 'other' }
}

// what one unit took in the fight: a number, or a full absorb we can name
type Taken = { amount: number; note?: 'shielded' | 'armor' }
const dealtLabel = (t: Taken) => (t.note === 'shielded' ? '0 (shield held)' : t.note === 'armor' ? '0 (armor)' : String(t.amount))

/** Compose the trade lines for a resolved unit/base combat, or null to fall back to the raw
 *  event recap. `isCombat` is the demo's existing combat-line filter — leftover consequences the
 *  trade doesn't capture (captures, freed prisoners, influence swings, breakthrough base spill)
 *  are appended after the trade so nothing is lost. Returned strings carry NO leading icon; the
 *  recap renderer prefixes ☠/💥/⚔ from the text. */
export function composeCombatRecap(
  prev: GameState,
  next: GameState,
  action: GameAction,
  events: { msg: string }[],
  isCombat: (msg: string) => boolean,
): string[] | null {
  // 1. What combat resolved on this action?
  let attackerIds: string[]
  let target: TargetRef
  let pairs: { blocker: string; onto: string }[]
  if (action.type === 'block') {
    const pa = prev.pendingAttack
    if (!pa) return null
    attackerIds = pa.attackers
    target = pa.target
    pairs = action.pairs ?? []
  } else if (action.type === 'attack') {
    if (next.pendingAttack) return null // the attack opened a block window; nothing resolved yet
    attackerIds = action.attackers
    target = action.target
    pairs = []
  } else {
    return null // intercept (v2.3) and non-combat actions keep the raw recap
  }
  if (target.kind !== 'unit' && target.kind !== 'base') return null
  const attackers = attackerIds.filter(id => prev.units[id])
  if (!attackers.length) return null

  // 2. Board facts (by id — never ambiguous).
  const nm = (id: string) => prev.cardSet[prev.cardOf[id]]?.name ?? '?'
  const pow = (id: string) => effPower(prev, prev.units[id]!)
  const fell = (id: string) => !!prev.units[id] && !next.units[id]

  const parsed = events.map(e => parseEvent(e.msg))
  const consumed = new Set<number>()
  // Find (and claim) the damage/absorb line for a victim by name. Best-effort: names aren't unique,
  // but the common duel has two distinct names, so direction is unambiguous.
  function taken(victim: string): Taken {
    for (let i = 0; i < parsed.length; i++) {
      if (consumed.has(i)) continue
      const p = parsed[i]
      if (p.kind === 'unitDmg' && p.subject === victim) { consumed.add(i); return { amount: p.amount } }
      if (p.kind === 'shield' && p.subject === victim) { consumed.add(i); return { amount: 0, note: 'shielded' } }
      if (p.kind === 'shrug' && p.subject === victim) { consumed.add(i); return { amount: 0, note: 'armor' } }
    }
    return { amount: 0 }
  }

  const participantNames = new Set<string>()
  const note = (id: string) => participantNames.add(nm(id))
  const outcome = (ids: string[]) => {
    const dead = ids.filter(fell)
    if (!dead.length) return 'both hold'
    const names = [...new Set(dead.map(nm))]
    return `${names.join(' & ')} ${dead.length > 1 ? 'fall' : 'falls'}`
  }

  const lines: string[] = []
  const blockersOf = (atkId: string) => pairs.filter(p => p.onto === atkId).map(p => p.blocker).filter(id => prev.units[id])
  const blocked = attackers.filter(a => blockersOf(a).length)
  const unblocked = attackers.filter(a => !blockersOf(a).length)

  // 3a. Each blocked attacker is its own sub-duel against the unit(s) that stepped in front.
  for (const a of blocked) {
    const bs = blockersOf(a)
    note(a); bs.forEach(note)
    const dealt = bs.map(b => taken(nm(b))).reduce((acc, t) => ({ amount: acc.amount + t.amount, note: t.note ?? acc.note }), { amount: 0 } as Taken)
    const took = taken(nm(a))
    const blkLabel = bs.map(nm).join(' + ')
    const blkPow = bs.reduce((s, b) => s + pow(b), 0)
    lines.push(`${nm(a)} (${pow(a)}) ↔ ${blkLabel} (${blkPow}, blocking): dealt ${dealtLabel(dealt)}, took ${dealtLabel(took)} — ${outcome([a, ...bs])}`)
  }

  // 3b. The unblocked attackers land on the declared target (unit → a real trade; base → no counter).
  if (unblocked.length) {
    if (target.kind === 'base') {
      const side = prev.sides[target.seat]
      unblocked.forEach(note)
      // base damage carries a "(N life)" suffix, so it parses as baseDmg — read it directly
      const idx = parsed.findIndex((p, i) => !consumed.has(i) && p.kind === 'baseDmg' && p.subject === side.name)
      const hit = idx >= 0 ? parsed[idx] : undefined
      if (idx >= 0) consumed.add(idx)
      const amount = hit && hit.kind === 'baseDmg' ? hit.amount : 0
      const life = hit && hit.kind === 'baseDmg' ? ` (${hit.life} life)` : ''
      lines.push(`${unblocked.map(nm).join(' + ')} strike ${side.name}'s base for ${amount} — the base can't strike back${life}`)
    } else {
      const t = target.id
      note(t); unblocked.forEach(note)
      const dealt = taken(nm(t))
      if (unblocked.length === 1) {
        const a = unblocked[0]
        const took = taken(nm(a))
        lines.push(`${nm(a)} (${pow(a)}) ↔ ${nm(t)} (${pow(t)}): dealt ${dealtLabel(dealt)}, took ${dealtLabel(took)} — ${outcome([a, t])}`)
      } else {
        const sumPow = unblocked.reduce((s, a) => s + pow(a), 0)
        const sumTook = unblocked.map(a => taken(nm(a)).amount).reduce((s, n) => s + n, 0)
        lines.push(`${unblocked.map(nm).join(' + ')} (${sumPow}) → ${nm(t)} (${pow(t)}): dealt ${dealtLabel(dealt)}; ${nm(t)} strikes back ${sumTook} — ${outcome([...unblocked, t])}`)
      }
    }
  }

  if (!lines.length) return null

  // 4. Consume the participants' own destroyed lines (the trade already names who fell), then keep
  //    every other combat consequence — captures, freed prisoners, influence, breakthrough spill.
  parsed.forEach((p, i) => { if (p.kind === 'destroyed' && participantNames.has(p.subject)) consumed.add(i) })
  const leftover = events.filter((e, i) => !consumed.has(i) && isCombat(e.msg)).map(e => e.msg)
  return [...lines, ...leftover]
}
