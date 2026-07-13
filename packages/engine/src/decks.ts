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
  // Decks are min-48, not exactly-48 (designer, issue #30) — Cataclysmic Charge doubles like
  // every other ≤2 workhorse and red simply runs 49 (⚑ the doubled alpha-strike pump is untested)
  // Reckless Abandon (issue #45) parses as cost 0 but is an X-scaling finisher, not a cheap
  // workhorse — single copy (⚑ curation call)
  redDoubles.delete('reckless-abandon')
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

  // Griff's Red (issue #50, 2026-07-13): the designer's own 65-card curation, transcribed from
  // his workshop — shipped as a named deck so the AI can pilot it in sims and at the table.
  const GRIFFS_RED: [string, number][] = [
    ['reckless-abandon', 4], ['cinder-initiate', 4], ['devastating-strike', 4], ['searing-bolt', 4],
    ['spark-hound', 2], ['berserker', 4], ['blood-rush', 1], ['cataclysmic-charge', 2],
    ['flameblade-raider', 1], ['warcry-leader', 1], ['bloodfrenzy', 4], ['collateral-damage', 2],
    ['fiery-impaler', 4], ['rageforged-brute', 1], ['volcanic-slam', 2], ['blaze-juggernaut', 1],
    ['burning-oath', 1], ['doombringer', 1], ['execution-swing', 4], ['inferno-titan', 4],
    ['rupture', 1], ['crimson-behemoth', 2], ['final-onslaught', 1], ['relentless-assault', 1],
    ['scorching-howl', 1], ['warlord-garok', 1], ['burn-the-frontline', 1], ['earthshaker', 1],
    ['raging-inferno', 1], ['unchained-rage', 1], ['apocalypse-engine', 1], ['last-stand', 1],
    ['worldrender', 1],
  ]
  if (GRIFFS_RED.every(([slug]) => set[slug])) {
    decks.push({
      slug: 'griffs-red',
      name: "Griff's Red",
      color: 'red',
      description: "The designer's own 65-card red — curated by hand, tested in anger. Burn everything.",
      cards: GRIFFS_RED.map(([slug, count]) => ({ slug, count })),
    })
  }

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
