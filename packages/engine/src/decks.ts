import { CARD_SET } from './cards/index.ts'

export interface PrebuiltDeck {
  slug: string
  name: string
  color: 'red' | 'yellow'
  description: string
  cards: { slug: string; count: number }[]
}

const byColor = (color: PrebuiltDeck['color']) => Object.values(CARD_SET).filter(c => c.color === color)
const RED_CARDS = byColor('red')
const YELLOW_CARDS = byColor('yellow')

// Red has 36 uniques; duplicate the twelve cheapest to reach 48 (DECISIONS 25).
// Since the session-006 churn re-costed the pool, cost ≤ 2 is exactly twelve slugs.
const RED_DOUBLES = new Set(RED_CARDS.filter(c => c.cost <= 2).map(c => c.slug))

export const PREBUILT_DECKS: PrebuiltDeck[] = [
  {
    slug: 'crimson-assault',
    name: 'Crimson Assault',
    color: 'red',
    description: 'Overwhelm them before your own recklessness catches up. Rush, Breakthrough, and fire everywhere.',
    cards: RED_CARDS.map(c => ({ slug: c.slug, count: RED_DOUBLES.has(c.slug) ? 2 : 1 })),
  },
  {
    slug: 'radiant-order',
    name: 'Radiant Order',
    color: 'yellow',
    description: 'Wall up, imprison the threats, and let Influence carry you to an inevitable victory.',
    cards: YELLOW_CARDS.map(c => ({ slug: c.slug, count: 1 })),
  },
]

export const deckSlugs = (d: PrebuiltDeck): string[] =>
  d.cards.flatMap(c => Array.from({ length: c.count }, () => c.slug))
