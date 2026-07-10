import type { CardSet } from '../types.ts'
import generated from './generated.json' with { type: 'json' }

/**
 * Canonical card pool. Source of truth: data/cards/<color>/<slug>.md (decision 46) —
 * `npm run cards` compiles + validates the ledger into generated.json. Never edit the JSON.
 */
export const CARD_SET: CardSet = generated as CardSet
