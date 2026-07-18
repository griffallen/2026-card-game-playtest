// @newgame/ai — the scoreboard (issue #97) + the `ai:scoreboard` CLI.
//
// The GATE. Plays the eval-policy bot against the incumbent heuristic bot over a fixed list of
// seeded games and reports the eval bot's win rate / record / average game length. Once we have a
// real trained model this is the number that says "beat the incumbent, ship it"; today, on the
// near-random toy model, it just proves the whole pipeline runs and is deterministic.
//
// Default match is a MIRROR (both seats play the same deck) with the seat the eval bot occupies
// alternating each game — so the only thing that differs between the two sides is the BRAIN, not the
// deck or the initiative. The play loop mirrors the engine simulator exactly (same seeded policy-rng
// derivation), so a seed reproduces the identical game. Node-only CLI; the play core is engine-pure.
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  CARD_SET, V3_RULES, applyAction, createGame, getLegalActions, heuristicPolicy,
  policyRngInit, PREBUILT_DECKS, deckSlugs,
  type GameState, type RulesConfig, type Seat,
} from '@newgame/engine'
import { evalPolicy, type EnginePolicy } from './policy.ts'
import type { LinearModel } from './infer.ts'

/** Same livelock ceiling the engine simulator uses — but here a runaway game is scored a DRAW
 *  rather than thrown, so the scoreboard never crashes on a pathological pairing. */
const MAX_ACTIONS = 4000

export interface GameOutcome { winner: Seat | null; rounds: number; actions: number }

/** One headless game between two policies. Deterministic: the policy rng derives from the seed via
 *  the engine's own `policyRngInit`, threaded through both seats — a seed reproduces the game. */
export function playGame(
  seed: number, deckA: string[], deckB: string[],
  policyA: EnginePolicy, policyB: EnginePolicy, rules: RulesConfig = V3_RULES,
): GameOutcome {
  let state: GameState = createGame({
    seed, rules, cardSet: CARD_SET,
    players: [{ name: 'A', deck: deckA }, { name: 'B', deck: deckB }],
  })
  const policies = [policyA, policyB] as const
  let rng = policyRngInit(seed)
  let actions = 0
  while (state.winner === null) {
    if (++actions > MAX_ACTIONS) return { winner: null, rounds: state.round, actions }
    const seat = state.actorSeat
    if (!getLegalActions(state, seat).length) return { winner: null, rounds: state.round, actions }
    let choice
    ;[choice, rng] = policies[seat](state, seat, rng)
    state = applyAction(state, choice, seat).state
  }
  return { winner: state.winner, rounds: state.round, actions }
}

export interface ScoreboardOpts {
  seeds?: number[]      // explicit seed list (wins over n)
  n?: number            // else play seeds 1..n
  deck?: string         // mirror deck for both seats (default 'crimson-assault')
  deckA?: string        // asymmetric override for seat 0's deck
  deckB?: string        // asymmetric override for seat 1's deck
  rules?: RulesConfig
}

export interface ScoreboardResult {
  games: number
  evalWins: number
  heuristicWins: number
  draws: number
  winRate: number       // eval bot wins / games
  record: string        // "evalWins-heuristicWins-draws"
  avgRounds: number
  avgActions: number
  evalAsSeat0: { wins: number; games: number }
  evalAsSeat1: { wins: number; games: number }
  decks: { a: string; b: string }
}

const slugsFor = (slug: string): string[] => {
  const d = PREBUILT_DECKS.find(x => x.slug === slug)
  if (!d) throw new Error(`no such prebuilt deck: ${slug} (have: ${PREBUILT_DECKS.map(x => x.slug).join(', ')})`)
  return deckSlugs(d)
}

/**
 * Play the eval bot vs the heuristic bot over a fixed seed set and tally the result. The eval bot
 * alternates seats game-to-game (even games seat 0, odd games seat 1) to cancel any first-player
 * edge. Deterministic end-to-end: fixed seeds + fixed decks + seeded policy rng.
 */
export function runScoreboard(model: LinearModel, opts: ScoreboardOpts = {}): ScoreboardResult {
  const aSlug = opts.deckA ?? opts.deck ?? 'crimson-assault'
  const bSlug = opts.deckB ?? opts.deck ?? 'crimson-assault'
  const A = slugsFor(aSlug)
  const B = slugsFor(bSlug)
  const rules = opts.rules ?? V3_RULES
  const seeds = opts.seeds ?? Array.from({ length: opts.n ?? 20 }, (_, i) => i + 1)
  const evalP = evalPolicy(model)

  let evalWins = 0, heuristicWins = 0, draws = 0, roundsSum = 0, actionsSum = 0
  const s0 = { wins: 0, games: 0 }
  const s1 = { wins: 0, games: 0 }

  for (let i = 0; i < seeds.length; i++) {
    const evalSeat: Seat = (i % 2) as Seat
    const seat0: EnginePolicy = evalSeat === 0 ? evalP : heuristicPolicy
    const seat1: EnginePolicy = evalSeat === 1 ? evalP : heuristicPolicy
    const out = playGame(seeds[i], A, B, seat0, seat1, rules)
    roundsSum += out.rounds
    actionsSum += out.actions
    const tally = evalSeat === 0 ? s0 : s1
    tally.games++
    if (out.winner === null) draws++
    else if (out.winner === evalSeat) { evalWins++; tally.wins++ }
    else heuristicWins++
  }

  const games = seeds.length
  return {
    games,
    evalWins, heuristicWins, draws,
    winRate: games ? evalWins / games : 0,
    record: `${evalWins}-${heuristicWins}-${draws}`,
    avgRounds: games ? roundsSum / games : 0,
    avgActions: games ? actionsSum / games : 0,
    evalAsSeat0: s0, evalAsSeat1: s1,
    decks: { a: aSlug, b: bSlug },
  }
}

/** Default model location: data/models/weights.v1.json at the repo root (matches ai:train). */
function defaultModelPath(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../..', 'data/models/weights.v1.json')
}

/** `ai:scoreboard [n] [modelPath]` — load a model and play it against the heuristic bot. */
function main(): void {
  const n = process.argv[2] ? Number(process.argv[2]) : 20
  const modelPath = process.argv[3] ? resolve(process.argv[3]) : defaultModelPath()
  if (!existsSync(modelPath)) {
    console.error(`ai:scoreboard — no model at ${modelPath}. Run \`npm run ai:train\` first.`)
    process.exit(1)
  }
  const model = JSON.parse(readFileSync(modelPath, 'utf8')) as LinearModel
  const r = runScoreboard(model, { n })
  console.log(`ai:scoreboard — eval bot vs heuristic, mirror ${r.decks.a}, N=${r.games} (seeds 1..${r.games})`)
  console.log(`  record (eval-heuristic-draw): ${r.record}   winRate ${(100 * r.winRate).toFixed(1)}%`)
  console.log(`  as seat0: ${r.evalAsSeat0.wins}/${r.evalAsSeat0.games}   as seat1: ${r.evalAsSeat1.wins}/${r.evalAsSeat1.games}`)
  console.log(`  avg ${r.avgRounds.toFixed(1)} rounds, ${r.avgActions.toFixed(0)} actions/game`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
