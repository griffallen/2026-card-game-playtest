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
  const purple = Object.values(set).filter(c => c.color === 'purple')

  // Crimson Assault — Griff's own hand-curated red (issue #50), promoted to the canonical demo
  // deck (issue #94, 2026-07-15: "move the current Crimson Assault / Radiant Order names to
  // [Griff's] decks and delete the original[s]"). The stock auto-derived lists — every card in
  // the color, workhorses doubled — are gone; the named decks now ARE the designer's decks, so
  // sims grade against the real thing, not a proxy. Reckless Abandon (issue #45) is an X-scaling
  // finisher, not a cheap workhorse. (iron-discipline prints as "Iron Plating".)
  const CRIMSON_ASSAULT: [string, number][] = [
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
  // Radiant Order — Griff's own hand-curated yellow (issue #81), promoted to canonical (#94).
  const RADIANT_ORDER: [string, number][] = [
    ['vanguard-sentinel', 4], ['containment-priest', 2], ['sunguard-defender', 2], ['bulwark-protector', 2],
    ['justicar-enforcer', 2], ['noble-purifier', 2], ['sanctified-bastion', 2], ['exemplar-knight', 1],
    ['fortress-keeper', 1], ['high-justiciar', 1], ['lawbringer', 1], ['censer-of-purity', 1],
    ['custodian-of-law', 1], ['dawnspear-paladin', 1], ['gateward-colossus', 1], ['hierophant', 1],
    ['inquisitor', 1], ['archon-of-order', 1], ['champion-of-the-faith', 2], ['radiant-citadel', 2],
    ['light-s-vanguard', 2],
    ['binding-light', 2], ['prison-warrant', 1], ['subjugate', 1], ['disarming-order', 2],
    ['imprisonment-chamber', 2], ['prison-of-light', 2], ['supreme-sentence', 1],
    ['iron-discipline', 2], ['oath-of-order', 2], ['disciplined-mind', 2], ['unshakable-wall', 2],
  ]

  const decks: PrebuiltDeck[] = [
    {
      slug: 'crimson-assault',
      name: 'Crimson Assault',
      color: 'red',
      description: "Overwhelm them before your own recklessness catches up — the designer's own red, curated in anger. Rush, Breakthrough, and fire everywhere.",
      cards: CRIMSON_ASSAULT.map(([slug, count]) => ({ slug, count })),
    },
    {
      slug: 'radiant-order',
      name: 'Radiant Order',
      color: 'yellow',
      description: "Wall up, capture the threats, and let Influence carry you — the designer's own yellow: guard wall, prison-and-capture lock, an inevitable clock.",
      cards: RADIANT_ORDER.map(([slug, count]) => ({ slug, count })),
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
