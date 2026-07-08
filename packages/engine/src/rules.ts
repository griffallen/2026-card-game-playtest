import type { RulesConfig } from './types.ts'

/** Defaults per docs/SPECS/game-rules.md §2 — every value admin-tunable per rules version. */
export const DEFAULT_RULES: RulesConfig = {
  startingLife: 20,
  influenceWinThreshold: 15,
  startingHandSize: 7,
  startingResources: 2,
  chooseStartingResources: true,
  mulliganPenalty: 1,
  emptyDrawLifeLoss: 1,
  emptyDrawInfluenceLoss: 1,
  drawPerTurn: 2,
  firstTurnDraw: 1,
  resourcesPerTurn: 1,
  deckMinSize: 48,
  maxCopies: 4,
  upgradePressureInfluence: 1,
  prisonDecayPerUnit: 1,
  prisonReleaseThreshold: 0,
  summoningSickness: true,
  moveExhausts: true,
  simultaneousLifeTiebreak: 'actor',
}

/** Merge a stored (possibly partial/older) config over current defaults. */
export function normalizeRules(partial: Partial<RulesConfig> | null | undefined): RulesConfig {
  return { ...DEFAULT_RULES, ...(partial ?? {}) }
}
