import type { RulesConfig } from './types.ts'

/** Defaults per docs/SPECS/game-rules.md §2 — every value admin-tunable per rules version. */
export const DEFAULT_RULES: RulesConfig = {
  startingLife: 20,
  influenceWinThreshold: 15,
  startingHandSize: 7,
  startingResources: 2,
  chooseStartingResources: true,
  mulliganPenalty: 1,
  mulliganStyle: 'decrement',   // decision 58: 'london' = full redraw, bottom one per mulligan
  emptyDrawLifeLoss: 1,
  emptyDrawInfluenceLoss: 1,
  drawPerRound: 2,
  firstRoundDraw: 2,          // decision 44: no round-1 asymmetry
  resourcesPerRound: 1,
  deckMinSize: 48,
  maxCopies: 4,
  upgradePressureInfluence: 1,
  prisonDecayPerUnit: 1,
  prisonReleaseThreshold: 0,
  summoningSickness: false,   // decision 41: units enter ready
  moveExhausts: true,
  rushCoversAttack: false,
  interceptExhausts: true,
  counterAssignment: 'auto',
  armorPerAttack: 'once',
  maxAttackers: 0,
  simultaneousLifeTiebreak: 'actor',
  combatModel: 'intercept',
  pipModel: 'none',
  upgradesOrphan: false,
  blockingExhausts: true,   // inert under 'intercept'; v3 combat reads it (decision 62)
}

/** The v3.0 preset (game-rules-v3-draft): flips the structural switches, inherits the rest. */
export const V3_RULES: RulesConfig = {
  ...DEFAULT_RULES,
  combatModel: 'blockerPairing',
  pipModel: 'presence',
  upgradesOrphan: true,
}

/** Merge a stored (possibly partial/older) config over current defaults, mapping legacy v1 keys. */
export function normalizeRules(partial: (Partial<RulesConfig> & Record<string, unknown>) | null | undefined): RulesConfig {
  const p: Record<string, unknown> = { ...(partial ?? {}) }
  for (const [old, nu] of [['drawPerTurn', 'drawPerRound'], ['firstTurnDraw', 'firstRoundDraw'], ['resourcesPerTurn', 'resourcesPerRound']] as const) {
    if (old in p && !(nu in p)) p[nu] = p[old]
    delete p[old]
  }
  return { ...DEFAULT_RULES, ...(p as Partial<RulesConfig>) }
}
