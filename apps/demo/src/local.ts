import {
  CARD_SET, DEFAULT_RULES, PREBUILT_DECKS, createGame, deckSlugs,
  type CardSet, type GameState, type PolicyName, type Seat,
} from '@newgame/engine'

/** Engine card set with art urls resolved against the deployed base path (keep each card's own extension — the veil set ships SVGs). */
export const DEMO_CARDS: CardSet = Object.fromEntries(
  Object.entries(CARD_SET).map(([slug, def]) => [
    slug,
    { ...def, artUrl: `${import.meta.env.BASE_URL}${(def.artUrl ?? `/cards/${slug}.jpg`).replace(/^\//, '')}` },
  ]),
)

export const DECKS = PREBUILT_DECKS
export type Mode = 'hotseat' | 'vs-ai' | 'watch'

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
}

export function newLocalGame(cfg: DemoConfig): GameState {
  const a = DECKS.find(d => d.slug === cfg.deckA) ?? DECKS[0]
  const b = DECKS.find(d => d.slug === cfg.deckB) ?? DECKS[1]
  return createGame({
    seed: cfg.seed,
    rules: DEFAULT_RULES,
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
