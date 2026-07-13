import {
  CARD_SET, DEFAULT_RULES, PREBUILT_DECKS, V3_RULES, createGame, deckSlugs,
  type CardSet, type GameState, type PolicyName, type Seat,
} from '@newgame/engine'
import type { Sleeve } from '@ui/game/sleeves.ts'

/** Engine card set with art urls resolved against the deployed base path (keep each card's own extension — the veil set ships SVGs). */
export const DEMO_CARDS: CardSet = Object.fromEntries(
  Object.entries(CARD_SET).map(([slug, def]) => [
    slug,
    { ...def, artUrl: `${import.meta.env.BASE_URL}${(def.artUrl ?? `/cards/${slug}.jpg`).replace(/^\//, '')}` },
  ]),
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
      { name: cfg.nameA, deck: deckSlugs(a) },
      { name: cfg.nameB, deck: deckSlugs(b) },
    ],
  })
}

export function aiControls(cfg: DemoConfig, seat: Seat): boolean {
  if (cfg.mode === 'watch') return true
  if (cfg.mode === 'vs-ai') return seat === 1
  return false
}
