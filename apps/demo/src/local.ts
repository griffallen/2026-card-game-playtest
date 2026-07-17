import {
  CARD_SET, DEFAULT_RULES, PREBUILT_DECKS, V3_RULES, createGame, deckSlugs,
  type CardSet, type GameState, type PolicyName, type Seat,
} from '@newgame/engine'
import type { Sleeve } from '@ui/game/sleeves.ts'

// Build-time art version (commit SHA), injected by vite.config.ts `define`. Appended to
// every art URL so overwritten-in-place card images (#103) bust the browser/CDN cache on
// each deploy instead of serving a stale copy.
declare const __ART_VER__: string

/** Engine card set with art urls resolved against the deployed base path (keep each card's own extension — the veil set ships SVGs), cache-busted by build version. */
export const DEMO_CARDS: CardSet = Object.fromEntries(
  Object.entries(CARD_SET).map(([slug, def]) => {
    const path = `${import.meta.env.BASE_URL}${(def.artUrl ?? `/cards/${slug}.jpg`).replace(/^\//, '')}`
    return [slug, { ...def, artUrl: `${path}${path.includes('?') ? '&' : '?'}v=${__ART_VER__}` }]
  }),
)

export const DECKS = PREBUILT_DECKS
export type Mode = 'hotseat' | 'vs-ai' | 'watch'

import { allDecks } from './custom-decks.ts'

export interface DemoConfig {
  mode: Mode
  deckA: string   // prebuilt slug, seat 0
  deckB: string
  seed: number
  nameA: string
  nameB: string
  /** bot brains per seat (watch mode; seat 1 in vs-ai) — must match the simulator for faithful replays */
  policyA: PolicyName
  policyB: PolicyName
  /** decision 58 A/B: full-redraw mulligans that owe cards to the deck bottom */
  londonMulligan?: boolean
  rulesVersion?: 'v2.3' | 'v3.0'
  /** issue #61: per-seat sleeve picks — defaults to ivory (seat 0) / gunmetal (seat 1) */
  sleeves?: [Sleeve, Sleeve]
}

// #111: a saved deck can still name a card a later balance pass deleted (e.g. Doombringer).
// The engine rightly refuses a deck with an unknown card — so drop vanished slugs here, before
// it ever seats the game. A stale saved deck must never crash the table; it just comes up lighter.
function liveSlugs(slugs: string[], who: string): string[] {
  const live = slugs.filter(s => DEMO_CARDS[s])
  if (live.length !== slugs.length) {
    const gone = [...new Set(slugs.filter(s => !DEMO_CARDS[s]))]
    console.warn(`${who}: dropped ${slugs.length - live.length} card(s) no longer in the set: ${gone.join(', ')}`)
  }
  return live
}

export function newLocalGame(cfg: DemoConfig): GameState {
  const pool = allDecks()   // prebuilts + the browser's custom decks (issue #30)
  const a = pool.find(d => d.slug === cfg.deckA) ?? DECKS[0]
  const b = pool.find(d => d.slug === cfg.deckB) ?? DECKS[1]
  return createGame({
    seed: cfg.seed,
    rules: {
      ...(cfg.rulesVersion === 'v3.0' ? V3_RULES : DEFAULT_RULES),
      ...(cfg.londonMulligan ? { mulliganStyle: 'london' as const } : {}),
    },
    cardSet: DEMO_CARDS,
    players: [
      { name: cfg.nameA, deck: liveSlugs(deckSlugs(a), cfg.nameA) },
      { name: cfg.nameB, deck: liveSlugs(deckSlugs(b), cfg.nameB) },
    ],
  })
}

export function aiControls(cfg: DemoConfig, seat: Seat): boolean {
  if (cfg.mode === 'watch') return true
  if (cfg.mode === 'vs-ai') return seat === 1
  return false
}
