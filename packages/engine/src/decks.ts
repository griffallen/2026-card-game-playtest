import type { CardSet } from './types.ts'
import { CARD_SET } from './cards/index.ts'

export interface PrebuiltDeck {
  slug: string
  name: string
  color: 'red' | 'yellow' | 'purple'
  description: string
  cards: { slug: string; count: number }[]
}

/**
 * Derive the prebuilt decks from any card set — exported so scripts/cards-build.ts can gate a
 * ledger edit on deck legality against the freshly compiled set (a designer cost edit can silently
 * move a card in or out of a doubles rule; the PR gate must catch that, not a later test run).
 */
export function buildPrebuiltDecks(set: CardSet): PrebuiltDeck[] {
  const byColor = (color: PrebuiltDeck['color']) => Object.values(set).filter(c => c.color === color)
  const red = byColor('red')
  const yellow = byColor('yellow')
  const purple = byColor('purple')

  // Red has 36 uniques; duplicate twelve workhorses to reach 48 (DECISIONS 25).
  // Curated (session 006 balance pass): the cheap core minus the two utility actions,
  // plus the two cost-3 bodies — doubling Warpath/Pillage instead measurably sank red.
  const redDoubles = new Set(red.filter(c => c.cost <= 2).map(c => c.slug))
  redDoubles.delete('warpath')
  redDoubles.delete('pillage')
  // PR #35 dropped Cataclysmic Charge to 2 — single copy keeps the deck at 48 and the
  // +3P/Breakthrough alpha strike un-doubled at its new rate (⚑ swap-in-something-else freely)
  redDoubles.delete('cataclysmic-charge')
  redDoubles.add('rageforged-brute')
  redDoubles.add('volcanic-slam')

  const decks: PrebuiltDeck[] = [
    {
      slug: 'crimson-assault',
      name: 'Crimson Assault',
      color: 'red',
      description: 'Overwhelm them before your own recklessness catches up. Rush, Breakthrough, and fire everywhere.',
      cards: red.map(c => ({ slug: c.slug, count: redDoubles.has(c.slug) ? 2 : 1 })),
    },
    {
      slug: 'radiant-order',
      name: 'Radiant Order',
      color: 'yellow',
      description: 'Wall up, capture the threats, and let Influence carry you to an inevitable victory.',
      cards: yellow.map(c => ({ slug: c.slug, count: 1 })),
    },
  ]

  // Purple's 36 uniques were designed with exactly twelve cost ≤ 2 slugs, so the doubles rule is clean.
  if (purple.length) {
    const purpleDoubles = new Set(purple.filter(c => c.cost <= 2).map(c => c.slug))
    decks.push({
      slug: 'veiled-court',
      name: 'Veiled Court',
      color: 'purple',
      description: 'Strike from where you cannot be answered. Ranged assassins, withering curses, and a court that profits from every named kill.',
      cards: purple.map(c => ({ slug: c.slug, count: purpleDoubles.has(c.slug) ? 2 : 1 })),
    })
  }
  return decks
}

export const PREBUILT_DECKS: PrebuiltDeck[] = buildPrebuiltDecks(CARD_SET)

export const deckSlugs = (d: Pick<PrebuiltDeck, 'cards'>): string[] =>
  d.cards.flatMap(c => Array.from({ length: c.count }, () => c.slug))
