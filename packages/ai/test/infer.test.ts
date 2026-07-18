import { describe, expect, it } from 'vitest'
import { FEATURE_NAMES, FEATURE_VERSION } from '../src/index.ts'
import { scoreState, sigmoid, type LinearModel } from '../src/infer.ts'
import { blankGame } from './helpers.ts'

/** A valid, all-zero model for the current feature layout — scores every state at sigmoid(0)=0.5. */
function zeroModel(): LinearModel {
  return { featureVersion: FEATURE_VERSION, weights: new Array(FEATURE_NAMES.length).fill(0), bias: 0 }
}

describe('sigmoid', () => {
  it('stays finite and inside (0,1) even at extremes', () => {
    for (const z of [-1e6, -50, -1, 0, 1, 50, 1e6]) {
      const p = sigmoid(z)
      expect(Number.isFinite(p)).toBe(true)
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
    expect(sigmoid(0)).toBeCloseTo(0.5, 12)
  })
})

describe('scoreState', () => {
  it('returns a probability in [0,1], deterministically', () => {
    const state = blankGame()
    const model = zeroModel()
    const a = scoreState(state, 0, model)
    const b = scoreState(state, 0, model)
    expect(a).toBe(b)                       // pure: same inputs -> identical output
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThanOrEqual(1)
    expect(a).toBeCloseTo(0.5, 12)          // zero model -> sigmoid(0)
  })

  it('moves the probability when weights are non-zero', () => {
    const state = blankGame()
    const model = zeroModel()
    const lifeIdx = FEATURE_NAMES.indexOf('me_life')
    expect(lifeIdx).toBeGreaterThanOrEqual(0)
    model.weights[lifeIdx] = 1                // life is ~20 -> strongly positive logit
    const p = scoreState(state, 0, model)
    expect(p).toBeGreaterThan(0.9)
  })

  it('throws a clear error on a featureVersion mismatch', () => {
    const state = blankGame()
    const bad = { ...zeroModel(), featureVersion: FEATURE_VERSION + 1 }
    expect(() => scoreState(state, 0, bad)).toThrow(/featureVersion/i)
  })

  it('throws when the weight count does not match the feature layout', () => {
    const state = blankGame()
    const bad: LinearModel = { featureVersion: FEATURE_VERSION, weights: [1, 2, 3], bias: 0 }
    expect(() => scoreState(state, 0, bad)).toThrow(/weight/i)
  })
})
