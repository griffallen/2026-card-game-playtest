import type { CardSet } from '../types.ts'
import { toSet } from './builders.ts'
import { RED_CARDS } from './red.ts'
import { YELLOW_CARDS } from './yellow.ts'
import overrides from './overrides.json' with { type: 'json' }

/**
 * Canonical card pool. TypeScript definitions are the base; data/cards.csv (the designer's
 * editing surface) compiles to overrides.json via scripts/cards-import.ts and wins by slug.
 * The DB seeds from this; games snapshot from the DB.
 */
export const CARD_SET: CardSet = {
  ...toSet(RED_CARDS),
  ...toSet(YELLOW_CARDS),
  ...(overrides as CardSet),
}

export { RED_CARDS, YELLOW_CARDS }
