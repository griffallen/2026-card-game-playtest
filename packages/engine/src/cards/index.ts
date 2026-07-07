import type { CardSet } from '../types.ts'
import { toSet } from './builders.ts'
import { RED_CARDS } from './red.ts'
import { YELLOW_CARDS } from './yellow.ts'

/** Canonical card pool — the DB seeds from this; games snapshot from the DB. */
export const CARD_SET: CardSet = { ...toSet(RED_CARDS), ...toSet(YELLOW_CARDS) }

export { RED_CARDS, YELLOW_CARDS }
