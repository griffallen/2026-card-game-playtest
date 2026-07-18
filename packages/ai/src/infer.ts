// @newgame/ai — inference (issue #97). The PURE win-probability evaluator the in-browser bot runs.
//
// A stored model is a plain linear model over the RAW feature vector: score = sigmoid(w·x + b).
// The offline trainer folds any feature standardization it used into these raw weights, so this
// module never needs the training statistics — it stays a bare dot-product. Node-free by rule:
// imports nothing from `node:*`, so the exact same code runs in the demo. (features.ts is likewise
// pure; the only engine surface reached here is the type-level GameState/Seat.)
import type { GameState, Seat } from '@newgame/engine'
import { FEATURE_VERSION, featurize } from './features.ts'

/**
 * A trained linear evaluator. Valid ONLY for the FEATURE_VERSION it was fit against — the feature
 * layout is the model's contract. `weights` is one coefficient per feature (same order as
 * FEATURE_NAMES); `bias` is the intercept. The rest is provenance, ignored by inference.
 */
export interface LinearModel {
  featureVersion: number
  weights: number[]
  bias: number
  trainedOn?: { games: number; states: number }
  hyperparams?: Record<string, number>
  featureCount?: number
  createdBy?: string
}

/** Numerically-stable logistic sigmoid: finite and inside (0,1) for any finite (and infinite) z. */
export function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z)
    return 1 / (1 + e)
  }
  const e = Math.exp(z)
  return e / (1 + e)
}

/** Guard that a model can be applied to the current feature layout at all. Throws a clear,
 *  actionable error otherwise — a model is worthless against a layout it wasn't trained on. */
function assertApplicable(model: LinearModel, featureLen: number): void {
  if (model.featureVersion !== FEATURE_VERSION) {
    throw new Error(
      `model featureVersion ${model.featureVersion} does not match engine FEATURE_VERSION ${FEATURE_VERSION} — retrain the model against the current feature layout`,
    )
  }
  if (model.weights.length !== featureLen) {
    throw new Error(
      `model has ${model.weights.length} weights but the feature vector is length ${featureLen} — the model does not fit this feature layout`,
    )
  }
}

/**
 * P(`seat` wins) as this model reads the board: sigmoid(dot(featurize(state, seat), weights) + bias).
 * Pure and deterministic — same (state, seat, model) always yields the same value in [0,1]. Never
 * mutates the state. Throws on a feature-version / length mismatch (see assertApplicable).
 */
export function scoreState(state: GameState, seat: Seat, model: LinearModel): number {
  const x = featurize(state, seat)
  assertApplicable(model, x.length)
  let z = model.bias
  for (let i = 0; i < x.length; i++) z += model.weights[i] * x[i]
  return sigmoid(z)
}
