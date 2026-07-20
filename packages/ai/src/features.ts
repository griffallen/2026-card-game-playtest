// ─── stats-not-identities ─────────────────────────────────────────────────────
// Griff's governing ruling, ratified on #97. Features describe what cards ARE — their
// stats, keywords, and board-level aggregates — NEVER which cards they are. There is
// deliberately no per-card / one-hot / "is-<name>-present" feature in this module, and
// none may ever be added. The model must learn about PROFILES ("a cheap high-power unit
// with an aggressive keyword is dangerous"), not names, so it stays robust when cards are
// renamed, retuned, added, or removed. If you are ever tempted to add a card-id feature,
// that is the one thing this module must not do.
//
// A pure, deterministic function of (GameState, seat): no clock, no RNG, no mutation. Same
// state + same seat always yields the same vector. FEATURE_NAMES is the versioned source of
// truth for the vector's length and index→meaning; the vector and the names are built from
// one ordered spec list (SPECS) so they can never drift apart.

import type { GameState, KeywordName, Seat } from '@newgame/engine'
import { effHealth, effPower, hasKw, influenceFor } from '@newgame/engine'

/** Bump when the vector LAYOUT (order or length) changes. A stored model is only valid for
 *  the FEATURE_VERSION it was trained against. */
// v2 (2026-07-20): reach, flying, overextend and untargetable were cut from the engine, so the
// vector loses four always-zero slots. Nothing to invalidate — no model artifact is versioned
// (data/models/ is gitignored as regenerable) and no corpus store exists yet.
// v3 (2026-07-20, #134): the prison package left the engine with it — me/opp_imprisoned_count
// were two more always-zero slots reading a field that no longer exists.
export const FEATURE_VERSION = 3

const other = (s: Seat): Seat => (1 - s) as Seat

// The engine's full keyword vocabulary, in a fixed, versioned order. Kept exhaustive against
// the engine's KeywordName union by the compile-time check just below: add a keyword to the
// engine enum and this module stops typechecking until the keyword is listed here — a
// deliberate, reviewed vector-length change rather than a silent gap.
export const KEYWORDS = [
  'guard', 'armor', 'rush', 'ranged', 'breakthrough',
  'cantAttack', 'scar', 'shielded', 'hidden', 'infiltrate', 'capture',
  'sneak', 'tribune',
] as const satisfies readonly KeywordName[]
// Exhaustiveness guard: KeywordName must be assignable to the union of KEYWORDS members.
// (Non-distributive — KeywordName is a concrete union here, so this checks whole-set coverage.)
type _KeywordsCoverAll = KeywordName extends (typeof KEYWORDS)[number] ? true : never
const _keywordsCoverAll: _KeywordsCoverAll = true
void _keywordsCoverAll

const PHASES = ['setup', 'bank', 'loop', 'intercept', 'block'] as const

// ─── Per-seat aggregates ───────────────────────────────────────────────────────
// Everything below is a stat or a count of stats.
interface SeatStats {
  life: number
  influence: number             // from THIS seat's perspective (+ = toward this seat's win)
  handSize: number
  deckSize: number
  discardSize: number
  resourcesTotal: number
  resourcesReady: number        // available to pay costs this turn (un-exhausted banked resources)
  unitCount: number
  totalPower: number            // sum of effective Power
  totalHealth: number           // sum of effective (max) Health
  totalRemainingHealth: number  // sum of (effective Health − damage), floored at 0
  avgUnitCost: number           // mean printed cost over units (0 when no units)
  maxPower: number              // highest single effective Power (0 when no units)
  upgradeCount: number          // attached upgrades this seat owns
  kw: Record<KeywordName, number>  // count of units carrying each keyword (effective)
}

function computeSeatStats(state: GameState, seat: Seat): SeatStats {
  const side = state.sides[seat]
  const kw = Object.fromEntries(KEYWORDS.map(k => [k, 0])) as Record<KeywordName, number>
  let unitCount = 0, totalPower = 0, totalHealth = 0, totalRemaining = 0, costSum = 0, maxPower = 0
  for (const u of Object.values(state.units)) {
    if (u.owner !== seat) continue
    const p = effPower(state, u)
    const h = effHealth(state, u)
    unitCount++
    totalPower += p
    totalHealth += h
    totalRemaining += Math.max(0, h - u.damage)
    costSum += state.cardSet[u.slug]?.cost ?? 0
    if (p > maxPower) maxPower = p
    for (const k of KEYWORDS) if (hasKw(state, u, k)) kw[k]++
  }
  let upgradeCount = 0
  for (const up of Object.values(state.upgrades)) {
    if (up.owner === seat && up.attachedTo !== null) upgradeCount++
  }
  return {
    life: side.life,
    influence: influenceFor(state, seat),
    handSize: side.hand.length,
    deckSize: side.deck.length,
    discardSize: side.discard.length,
    resourcesTotal: side.resources.length,
    resourcesReady: side.resources.filter(r => !r.exhausted).length,
    unitCount,
    totalPower,
    totalHealth,
    totalRemainingHealth: totalRemaining,
    avgUnitCost: unitCount ? costSum / unitCount : 0,
    maxPower,
    upgradeCount,
    kw,
  }
}

// ─── Feature specs — the single source of truth for order + length ─────────────
interface FeatCtx { state: GameState; seat: Seat; me: SeatStats; opp: SeatStats }
interface FeatureSpec { name: string; get: (c: FeatCtx) => number }

function buildSpecs(): FeatureSpec[] {
  const specs: FeatureSpec[] = []
  const push = (name: string, get: (c: FeatCtx) => number) => specs.push({ name, get })

  // Context — global tempo/phase, made perspective-relative where it matters.
  push('round', c => c.state.round)
  for (const ph of PHASES) push(`phase_${ph}`, c => (c.state.phase === ph ? 1 : 0))
  push('is_my_action', c => (c.state.actorSeat === c.seat ? 1 : 0))
  push('i_have_initiative', c => (c.state.initiative === c.seat ? 1 : 0))
  push('claimed_this_round', c => (c.state.claimedThisRound ? 1 : 0))
  push('pass_streak', c => c.state.passStreak)
  push('i_am_out_of_round', c => (c.state.outOfRound[c.seat] ? 1 : 0))
  push('opp_out_of_round', c => (c.state.outOfRound[other(c.seat)] ? 1 : 0))

  // Per-seat blocks: identical layout for 'me' (perspective seat) and 'opp'.
  const seatBlock = (prefix: 'me' | 'opp', pick: (c: FeatCtx) => SeatStats) => {
    push(`${prefix}_life`, c => pick(c).life)
    push(`${prefix}_influence`, c => pick(c).influence)
    push(`${prefix}_hand_size`, c => pick(c).handSize)
    push(`${prefix}_deck_size`, c => pick(c).deckSize)
    push(`${prefix}_discard_size`, c => pick(c).discardSize)
    push(`${prefix}_resources_total`, c => pick(c).resourcesTotal)
    push(`${prefix}_resources_ready`, c => pick(c).resourcesReady)
    push(`${prefix}_unit_count`, c => pick(c).unitCount)
    push(`${prefix}_total_power`, c => pick(c).totalPower)
    push(`${prefix}_total_health`, c => pick(c).totalHealth)
    push(`${prefix}_remaining_health`, c => pick(c).totalRemainingHealth)
    push(`${prefix}_avg_unit_cost`, c => pick(c).avgUnitCost)
    push(`${prefix}_max_power`, c => pick(c).maxPower)
    push(`${prefix}_upgrade_count`, c => pick(c).upgradeCount)
    for (const k of KEYWORDS) push(`${prefix}_kw_${k}`, c => pick(c).kw[k])
  }
  seatBlock('me', c => c.me)
  seatBlock('opp', c => c.opp)

  // Differentials (me − opp): a linear model reads these directly instead of having to
  // subtract two large features itself.
  push('diff_life', c => c.me.life - c.opp.life)
  push('diff_influence', c => c.me.influence - c.opp.influence)
  push('diff_hand_size', c => c.me.handSize - c.opp.handSize)
  push('diff_unit_count', c => c.me.unitCount - c.opp.unitCount)
  push('diff_total_power', c => c.me.totalPower - c.opp.totalPower)
  push('diff_total_health', c => c.me.totalHealth - c.opp.totalHealth)
  push('diff_remaining_health', c => c.me.totalRemainingHealth - c.opp.totalRemainingHealth)
  push('diff_max_power', c => c.me.maxPower - c.opp.maxPower)
  push('diff_resources_ready', c => c.me.resourcesReady - c.opp.resourcesReady)
  push('diff_card_advantage', c => (c.me.handSize + c.me.unitCount) - (c.opp.handSize + c.opp.unitCount))

  return specs
}

const SPECS: readonly FeatureSpec[] = buildSpecs()

/** The versioned feature names, in vector order. Length + index→meaning are fixed here. */
export const FEATURE_NAMES: readonly string[] = SPECS.map(s => s.name)

/** Turn a GameState (from `seat`'s perspective) into the fixed-length numeric feature vector.
 *  Pure and deterministic: same (state, seat) → identical vector, never mutating the state. */
export function featurize(state: GameState, seat: Seat): number[] {
  const ctx: FeatCtx = {
    state, seat,
    me: computeSeatStats(state, seat),
    opp: computeSeatStats(state, other(seat)),
  }
  return SPECS.map(s => s.get(ctx))
}

/** featurize + the parallel names, so a length/order mismatch is catchable and the vector
 *  stays interpretable. `names` is the shared FEATURE_NAMES constant (same every call). */
export function featurizeNamed(state: GameState, seat: Seat): { names: readonly string[]; vector: number[] } {
  return { names: FEATURE_NAMES, vector: featurize(state, seat) }
}

/** Interpretability helper: the vector zipped with its names as {name, value} pairs. */
export function describeFeatures(state: GameState, seat: Seat): { name: string; value: number }[] {
  const vector = featurize(state, seat)
  return FEATURE_NAMES.map((name, i) => ({ name, value: vector[i] }))
}
