import type { GameAction, Seat, PolicyName } from '@newgame/engine'

/** One recorded action, exactly as the demo's Copy Chronicle emits it: seat + the action. */
export interface ReplayStep {
  s: Seat
  a: GameAction
}

/** A resolved decklist as carried in the replay block (custom decks travel by their card list). */
export interface ReplayDeck {
  name: string
  slug: string
  cards: string[]
}

/**
 * The machine-readable replay block emitted by the demo's "Copy Chronicle" button
 * (apps/demo/src/DemoTable.tsx `copyChronicle`). Seed + both resolved decklists + rules +
 * every action in order — enough to re-run the exact game.
 */
export interface ReplayBlock {
  seed: number
  rules: string
  mulligan: boolean
  decks: { A: ReplayDeck; B: ReplayDeck }
  policies?: { A: PolicyName; B: PolicyName }
  actions: ReplayStep[]
}

/**
 * The version a stored log was played under. Purging old-version logs is a filter on this,
 * not archaeology. `rules` is the mode the player chose; `cards`+`engine` are the code the
 * game verified against at collection time.
 */
export interface Fingerprint {
  /** Directory-safe composite of all three axes — the corpus subdir name. */
  key: string
  /** Rules preset from the replay block, e.g. "v3.0". */
  rules: string
  /** Engine package version (packages/engine/package.json). */
  engine: string
  /** Short sha256 of the generated card catalog (packages/engine/src/cards/generated.json). */
  cards: string
}

/** Result of replaying a block byte-for-byte through the engine. */
export interface VerifyResult {
  /** Every recorded action applied legally (a byte-clean reproduction). */
  ok: boolean
  /** The replay reached a winner (a finished game, not a truncated paste). */
  terminal: boolean
  winner: Seat | null
  winnerName: string | null
  winReason: string | null
  rounds: number
  actionsApplied: number
  totalActions: number
  error?: string
  errorCode?: string
  errorStage?: 'setup' | 'action'
}

/** The metadata header stored alongside each corpus entry. */
export interface EntryMeta {
  gameId: string
  fingerprint: Fingerprint
  rules: string
  winner: Seat | null
  winnerName: string | null
  winReason: string | null
  rounds: number
  actionCount: number
  terminal: boolean
  /** Where the log came from — an issue-comment URL, a file path, or "stdin". */
  source: string
  /** Monotonic collection index, so replays are trainable in the order they arrived. */
  collectedOrder: number
  /** ISO wall-clock time of collection; optional (omitted when no clock is available). */
  collectedAt?: string
}

/** A stored corpus entry: its version/outcome header plus the full replay. */
export interface CorpusEntry {
  meta: EntryMeta
  replay: ReplayBlock
}

/** A filter over the version axes; every provided field must match an entry to select it. */
export interface FingerprintFilter {
  key?: string
  rules?: string
  engine?: string
  cards?: string
}
