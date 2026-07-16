// Combat transparency preview (issue #108) — DEMO-LAYER ONLY, no engine behavior touched.
//
// Combat in this game is deterministic: there are no dice. What lands, what strikes back, and who
// dies are all knowable the moment attackers and a target are chosen — the ONLY hidden variable is
// whether the defender assigns blockers or Guards AFTER the attack is declared. So before the human
// commits an attack we show the exact numbers for the UNBLOCKED outcome (design philosophy §3: win
// on shared information, never lose to a miscalculation of numbers the game already knows).
//
// This mirrors the v3 resolution (packages/engine/src/engine.ts → resolveBlockedAttack, no blockers):
//   • combined attacker Power lands on the target, reduced by the target's Armor, or fully eaten by
//     a Shield (decision 84 / v3 damageUnit);
//   • the target strikes back with its full effective Power (retaliation 'always'), DIVIDED across
//     the unblocked attackers highest-Power-first, ties by ascending instance id (decision 105) —
//     each attacker soaks up to what fells it through its own Armor, the remainder pours to the next;
//   • a Shield on an attacker absorbs its whole share (0 damage) but still consumes that share of the
//     retaliation pool, exactly as the engine does.
// It reads only fields the demo already has on the unit view — Power/Health/Armor/Shield are the
// engine's effective values (auras, upgrades, scar, mods all folded in) — so it never invents info.

/** The subset of a unit view the prediction needs. UnitView is structurally assignable to this. */
export interface PredictUnit {
  id: string
  name: string
  power: number
  health: number
  damage: number
  armor: number
  shielded: boolean
  keywords: string[]
  zone: number
  owner: 0 | 1
}

export interface AttackerOutcome {
  id: string
  name: string
  power: number
  /** damage that would actually land on this attacker from the target's counter (after armor/shield) */
  taken: number
  /** the attacker's shield would eat its whole share of the retaliation */
  shieldHeld: boolean
  /** this attacker would be destroyed by the counter */
  falls: boolean
}

export interface CombatPrediction {
  kind: 'unit' | 'base'
  /** combined Power the attack group sends at the target */
  attackerPower: number
  attackers: AttackerOutcome[]
  anyAttackerFalls: boolean
  /** any attacker carries Breakthrough — excess past a blocker/target spills to the base */
  hasBreakthrough: boolean

  // ── unit target ──
  targetName?: string
  targetArmor?: number
  targetShielded?: boolean
  /** damage that lands on the target after its Armor/Shield (0 if a shield holds) */
  landed?: number
  targetFalls?: boolean
  /** target Health remaining after the hit (0 if it falls) */
  targetRemaining?: number
  /** the target's counter-attack Power pool (0 if it does not retaliate) */
  retaliation?: number
  /** the target unit sits in its own Home zone — Breakthrough excess would siege the base */
  siege?: boolean

  // ── base target ──
  baseName?: string
  baseLifeBefore?: number
  baseLifeAfter?: number
}

// Mirror the engine's deterministic tie-break (helpers.ts → idNum): instance ids are like "u12".
const idNum = (id: string) => {
  const n = Number(id.slice(1))
  return Number.isFinite(n) ? n : 0
}

const hasKw = (u: PredictUnit, kw: string) => u.keywords.some(k => k === kw || k.startsWith(`${kw} `))

/** Home zone for a seat, matching the engine (types.ts → homeZone): seat 0 → zone 0, seat 1 → zone 2. */
const homeZone = (seat: 0 | 1) => (seat === 0 ? 0 : 2)

/**
 * Predict the unblocked outcome of an attack — what the demo shows before the human commits.
 * `retaliates` reflects the rules (v3 = always); pass false only for a rules set that suppresses it.
 */
export function predictCombat(
  attackers: PredictUnit[],
  target: { kind: 'unit'; unit: PredictUnit } | { kind: 'base'; name: string; life: number },
  retaliates = true,
): CombatPrediction {
  const attackerPower = attackers.reduce((s, a) => s + a.power, 0)
  const hasBreakthrough = attackers.some(a => hasKw(a, 'breakthrough'))

  if (target.kind === 'base') {
    // The base never strikes back (decision 84: everything retaliates except the base).
    return {
      kind: 'base',
      attackerPower,
      attackers: attackers.map(a => ({ id: a.id, name: a.name, power: a.power, taken: 0, shieldHeld: false, falls: false })),
      anyAttackerFalls: false,
      hasBreakthrough,
      baseName: target.name,
      baseLifeBefore: target.life,
      baseLifeAfter: target.life - attackerPower,
    }
  }

  const t = target.unit
  // 1. What lands on the target: a shield eats the whole blow; otherwise armor is subtracted once.
  const shieldHolds = t.shielded && attackerPower > 0
  const landed = shieldHolds ? 0 : Math.max(0, attackerPower - t.armor)
  const targetRemainingBefore = Math.max(0, t.health - t.damage)
  const targetFalls = !t.shielded && landed >= targetRemainingBefore && landed > 0
  const targetRemaining = Math.max(0, targetRemainingBefore - landed)

  // 2. The counter: the target's full effective Power, poured across the unblocked attackers
  //    highest-Power-first (ties by ascending instance id) — the engine's exact division.
  const retaliation = retaliates ? t.power : 0
  const order = attackers
    .slice()
    .sort((x, y) => y.power - x.power || idNum(x.id) - idNum(y.id))
  const takenById = new Map<string, { taken: number; shieldHeld: boolean; falls: boolean }>()
  let pool = retaliation
  for (const a of order) {
    const remaining = Math.max(0, a.health - a.damage)
    const gross = remaining + a.armor // what it takes to fell it through armor
    const chunk = Math.min(pool, gross)
    pool -= chunk
    if (a.shielded && chunk > 0) {
      takenById.set(a.id, { taken: 0, shieldHeld: true, falls: false })
      continue
    }
    const taken = Math.max(0, chunk - a.armor)
    takenById.set(a.id, { taken, shieldHeld: false, falls: taken >= remaining && taken > 0 })
  }

  const outcomes: AttackerOutcome[] = attackers.map(a => {
    const o = takenById.get(a.id) ?? { taken: 0, shieldHeld: false, falls: false }
    return { id: a.id, name: a.name, power: a.power, taken: o.taken, shieldHeld: o.shieldHeld, falls: o.falls }
  })

  return {
    kind: 'unit',
    attackerPower,
    attackers: outcomes,
    anyAttackerFalls: outcomes.some(o => o.falls),
    hasBreakthrough,
    targetName: t.name,
    targetArmor: t.armor,
    targetShielded: t.shielded,
    landed,
    targetFalls,
    targetRemaining,
    retaliation,
    siege: t.zone === homeZone(t.owner),
  }
}
