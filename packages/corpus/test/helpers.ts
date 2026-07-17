import {
  CARD_SET, V3_RULES, DEFAULT_RULES, PREBUILT_DECKS, POLICIES, policyRngInit,
  createGame, applyAction, deckSlugs,
  type GameState, type GameAction, type Seat, type PolicyName, type RulesConfig, type CardSet,
} from '@newgame/engine'
import type { ReplayBlock } from '../src/types.ts'

const RED = deckSlugs(PREBUILT_DECKS[0])
const YELLOW = deckSlugs(PREBUILT_DECKS[1])

export interface RecordOpts {
  policyA?: PolicyName
  policyB?: PolicyName
  rules?: 'v3.0' | 'v2.3'
  deckA?: string[]
  deckB?: string[]
  nameA?: string
  nameB?: string
  cardSet?: CardSet
}

/**
 * Record a full, deterministic game the same way the demo's Copy Chronicle would —
 * seed + resolved decks + rules + every action in order — but headless, via the engine's
 * own policies. The result replays byte-clean because it was produced by the engine itself.
 * Used as the "known-good current-version" fixture for the corpus tests.
 */
export function recordGame(seed: number, opts: RecordOpts = {}): ReplayBlock & { winner: Seat | null; rounds: number } {
  const policyA = opts.policyA ?? 'heuristic'
  const policyB = opts.policyB ?? 'heuristic'
  const rulesVersion = opts.rules ?? 'v3.0'
  const rules: RulesConfig = rulesVersion === 'v3.0' ? V3_RULES : DEFAULT_RULES
  const cardSet = opts.cardSet ?? CARD_SET
  const deckA = opts.deckA ?? RED
  const deckB = opts.deckB ?? YELLOW
  const nameA = opts.nameA ?? 'Recorder A'
  const nameB = opts.nameB ?? 'Recorder B'

  let state: GameState = createGame({
    seed, rules, cardSet,
    players: [{ name: nameA, deck: deckA }, { name: nameB, deck: deckB }],
  })
  let rng = policyRngInit(seed)
  const actions: { s: Seat; a: GameAction }[] = []
  let guard = 0
  while (state.winner === null) {
    if (++guard > 5000) throw new Error(`recordGame livelock at seed ${seed}`)
    const seat = state.actorSeat
    const policy = POLICIES[seat === 0 ? policyA : policyB]
    let choice: GameAction
    ;[choice, rng] = policy(state, seat, rng)
    actions.push({ s: seat, a: choice })
    state = applyAction(state, choice, seat).state
  }

  return {
    seed,
    rules: rulesVersion,
    mulligan: false,
    decks: {
      A: { name: nameA, slug: 'recorder-a', cards: deckA },
      B: { name: nameB, slug: 'recorder-b', cards: deckB },
    },
    policies: { A: policyA, B: policyB },
    actions,
    winner: state.winner,
    rounds: state.round,
  }
}

/** Wrap a replay block in a realistic GitHub paste: readable log then a fenced ```json block. */
export function asPaste(block: ReplayBlock): string {
  const { winner: _w, rounds: _r, ...clean } = block as ReplayBlock & Record<string, unknown>
  return [
    '```',
    '        ⚜',
    '  THE CHRONICLER · keeper of the ledger',
    '```',
    '',
    '[t1] Recorder A vs Recorder B — a game was played',
    '[t1] ... (readable chronicle omitted) ...',
    '',
    '---REPLAY (for AI analysis — issue #97)---',
    '```json',
    JSON.stringify(clean),
    '```',
  ].join('\n')
}
