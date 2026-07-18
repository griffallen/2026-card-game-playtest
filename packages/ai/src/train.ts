// @newgame/ai — the offline trainer (issue #97) + the `ai:train` CLI.
//
// Reads the versioned corpus, replays each game through the engine, and at every state it passes
// through emits training pairs `featurize(state, seat) -> did seat WIN this game (1/0)` for BOTH
// seats (a perspective-symmetric pair per state — every board teaches one win and one loss, and it
// doubles the signal from a thin corpus). Fits a logistic-regression linear model by deterministic
// full-batch gradient descent (zero init, fixed iterations + learning rate, NO rng, NO clock) and
// folds its feature standardization back into RAW weights, so the shipped model is exactly the
// `sigmoid(w·x + b)` that infer.ts applies. Older-meta ("archived") games are weighted DOWN by a
// fixed discount — the versioned-corpus philosophy: current-meta play should dominate the fit.
//
// This module is node-only (it reads the corpus + writes the model). It is deliberately NOT exported
// from index.ts, so importing @newgame/ai in the browser never pulls in `node:*` or the corpus lib.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  CARD_SET, DEFAULT_RULES, V3_RULES, applyAction, createGame,
  type GameState, type RulesConfig, type Seat,
} from '@newgame/engine'
import { loadCorpus, defaultCorpusDir, type CorpusEntry } from '@newgame/corpus'
import { FEATURE_NAMES, FEATURE_VERSION, featurize } from './features.ts'
import { sigmoid, type LinearModel } from './infer.ts'

/** One labeled example: a feature vector, its outcome label (1 = the seat won), and a sample weight
 *  (1 for current-meta play, ARCHIVE_DISCOUNT for older-meta/archived games). */
export interface TrainingPair {
  features: number[]
  label: number
  weight: number
}

/** Older-meta games count for a QUARTER of a current-meta game (a fixed, reviewed discount — not a
 *  purge: archived play still carries signal, it just must not dominate the current meta). */
export const ARCHIVE_DISCOUNT = 0.25

export interface TrainOpts {
  iterations: number
  learningRate: number
  l2: number
}

/** Fixed, rng-free hyperparameters. Small L2 keeps the near-random toy model well-behaved; none of
 *  these read a clock or a random source, so the fit is fully reproducible. */
export const DEFAULT_TRAIN_OPTS: TrainOpts = { iterations: 400, learningRate: 0.1, l2: 1e-3 }

export interface BuildResult {
  pairs: TrainingPair[]
  games: number   // games that replayed to a real terminal winner (trainable)
  states: number  // total states featurized across those games
  skipped: number // entries with no replay / no terminal winner / illegal reconstruction
}

/** Replay every corpus entry and turn each visited state into a pair of labeled examples (one per
 *  seat). A game with no trustworthy outcome (truncated replay, older card set, draw) is skipped —
 *  we never invent a label. Deterministic: the engine replay is seeded and pure. */
export function buildTrainingPairs(entries: CorpusEntry[]): BuildResult {
  const pairs: TrainingPair[] = []
  let games = 0, states = 0, skipped = 0

  for (const entry of entries) {
    const r = entry.replay
    if (!r) { skipped++; continue }
    const base: RulesConfig = r.rules === 'v3.0' ? V3_RULES : DEFAULT_RULES
    const rules: RulesConfig = r.mulligan ? { ...base, mulliganStyle: 'london' } : base

    let state: GameState
    try {
      state = createGame({
        seed: r.seed, rules, cardSet: CARD_SET,
        players: [
          { name: r.decks.A.name ?? 'A', deck: r.decks.A.cards },
          { name: r.decks.B.name ?? 'B', deck: r.decks.B.cards },
        ],
      })
    } catch { skipped++; continue }

    const visited: GameState[] = [state]
    for (const step of r.actions) {
      try { state = applyAction(state, step.a, step.s).state } catch { break }
      visited.push(state)
    }
    const winner = state.winner
    if (winner === null) { skipped++; continue } // no terminal outcome -> not trainable

    const weight = entry.meta.archived === true ? ARCHIVE_DISCOUNT : 1
    for (const st of visited) {
      for (const seat of [0, 1] as const) {
        pairs.push({ features: featurize(st, seat), label: winner === seat ? 1 : 0, weight })
      }
    }
    games++
    states += visited.length
  }
  return { pairs, games, states, skipped }
}

/**
 * Fit a logistic-regression linear model by deterministic, full-batch, weighted gradient descent.
 * Features are standardized (z-scored) during the fit for numerical sanity — feature magnitudes
 * range from small counts to life/influence in the tens — then that standardization is FOLDED into
 * the returned RAW weights, so the emitted model is a plain `sigmoid(w·x + b)` over the raw feature
 * vector (exactly what infer.ts expects; no training stats travel with the model).
 *
 * Pure and deterministic: zero init, fixed iteration count, no shuffling, no rng, no clock. Same
 * pairs in -> bit-identical weights out. An empty corpus yields a valid all-zero model.
 */
export function trainModel(
  pairs: TrainingPair[],
  opts: Partial<TrainOpts> = {},
  trainedOn: { games: number; states: number } = { games: 0, states: 0 },
): LinearModel {
  const o: TrainOpts = { ...DEFAULT_TRAIN_OPTS, ...opts }
  const dim = pairs[0]?.features.length ?? FEATURE_NAMES.length

  const hyperparams = {
    iterations: o.iterations,
    learningRate: o.learningRate,
    l2: o.l2,
    archiveDiscount: ARCHIVE_DISCOUNT,
  }
  const provenance = { featureCount: dim, createdBy: 'ai:train' as const }

  if (!pairs.length) {
    return { featureVersion: FEATURE_VERSION, weights: new Array(dim).fill(0), bias: 0, trainedOn, hyperparams, ...provenance }
  }

  // ── standardization stats (deterministic, data-derived) ──
  const mean = new Array<number>(dim).fill(0)
  for (const p of pairs) for (let j = 0; j < dim; j++) mean[j] += p.features[j]
  for (let j = 0; j < dim; j++) mean[j] /= pairs.length
  const std = new Array<number>(dim).fill(0)
  for (const p of pairs) for (let j = 0; j < dim; j++) { const d = p.features[j] - mean[j]; std[j] += d * d }
  for (let j = 0; j < dim; j++) { std[j] = Math.sqrt(std[j] / pairs.length); if (std[j] < 1e-9) std[j] = 1 }

  const X = pairs.map(p => {
    const row = new Array<number>(dim)
    for (let j = 0; j < dim; j++) row[j] = (p.features[j] - mean[j]) / std[j]
    return row
  })
  const totalWeight = pairs.reduce((s, p) => s + p.weight, 0) || 1

  // ── weighted full-batch gradient descent on binary cross-entropy ──
  const w = new Array<number>(dim).fill(0)
  let b = 0
  for (let iter = 0; iter < o.iterations; iter++) {
    const gw = new Array<number>(dim).fill(0)
    let gb = 0
    for (let k = 0; k < pairs.length; k++) {
      const xk = X[k]
      let z = b
      for (let j = 0; j < dim; j++) z += w[j] * xk[j]
      const err = (sigmoid(z) - pairs[k].label) * pairs[k].weight
      for (let j = 0; j < dim; j++) gw[j] += err * xk[j]
      gb += err
    }
    for (let j = 0; j < dim; j++) { const g = gw[j] / totalWeight + o.l2 * w[j]; w[j] -= o.learningRate * g }
    b -= o.learningRate * (gb / totalWeight)
  }

  // ── fold standardization into raw weights: sigmoid(w·(x-mean)/std + b) == sigmoid(rawW·x + rawB) ──
  const weights = new Array<number>(dim)
  let bias = b
  for (let j = 0; j < dim; j++) {
    weights[j] = w[j] / std[j]
    bias -= (w[j] * mean[j]) / std[j]
  }
  return { featureVersion: FEATURE_VERSION, weights, bias, trainedOn, hyperparams, ...provenance }
}

/** Default location for the shipped model: data/models/weights.v1.json at the repo root. */
export function defaultModelPath(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../..', 'data/models/weights.v1.json')
}

/** `ai:train [outPath]` — read the corpus, train, write weights.v1.json. */
function main(): void {
  const out = process.argv[2] ? resolve(process.argv[2]) : defaultModelPath()
  const entries = loadCorpus(defaultCorpusDir())
  const { pairs, games, states, skipped } = buildTrainingPairs(entries)
  const model = trainModel(pairs, {}, { games, states })
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, JSON.stringify(model, null, 2) + '\n')
  console.log(
    `ai:train — corpus ${entries.length} entries -> ${games} trainable games, ${states} states, ` +
    `${pairs.length} pairs (skipped ${skipped}); featureVersion ${model.featureVersion}; wrote ${out}`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
