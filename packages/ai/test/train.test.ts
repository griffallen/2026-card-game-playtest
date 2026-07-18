import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { loadCorpus, defaultCorpusDir, type CorpusEntry } from '@newgame/corpus'
import { FEATURE_NAMES, FEATURE_VERSION } from '../src/index.ts'
import {
  trainModel, buildTrainingPairs, ARCHIVE_DISCOUNT, type TrainingPair,
} from '../src/train.ts'

const DIM = FEATURE_NAMES.length

/** Linearly-separable synthetic set: feature[0] carries the signal; one column (index 5) is
 *  constant to exercise the zero-variance guard. Everything else is small noise-free filler. */
function syntheticPairs(): TrainingPair[] {
  const make = (signal: number, label: number): TrainingPair => {
    const f = new Array(DIM).fill(0)
    f[0] = signal
    f[1] = signal * 0.5
    f[5] = 3          // constant across every row -> std 0
    return { features: f, label, weight: 1 }
  }
  return [
    make(2, 1), make(3, 1), make(2.5, 1),
    make(-2, 0), make(-3, 0), make(-2.5, 0),
  ]
}

describe('trainModel', () => {
  it('is deterministic — same pairs in, bit-identical weights out', () => {
    const pairs = syntheticPairs()
    const a = trainModel(pairs)
    const b = trainModel(pairs)
    expect(a.weights).toEqual(b.weights)
    expect(a.bias).toBe(b.bias)
  })

  it('produces a well-formed, current-version model', () => {
    const m = trainModel(syntheticPairs())
    expect(m.featureVersion).toBe(FEATURE_VERSION)
    expect(m.weights.length).toBe(DIM)
    expect(m.weights.every(Number.isFinite)).toBe(true)
    expect(Number.isFinite(m.bias)).toBe(true)
  })

  it('actually learns the separating direction (positives score higher than negatives)', () => {
    const pairs = syntheticPairs()
    const m = trainModel(pairs)
    const sig = (x: number[]) => {
      let z = m.bias
      for (let i = 0; i < DIM; i++) z += m.weights[i] * x[i]
      return 1 / (1 + Math.exp(-z))
    }
    const pos = pairs.filter(p => p.label === 1).map(p => sig(p.features))
    const neg = pairs.filter(p => p.label === 0).map(p => sig(p.features))
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length
    expect(mean(pos)).toBeGreaterThan(mean(neg))
    expect(mean(pos)).toBeGreaterThan(0.5)
    expect(mean(neg)).toBeLessThan(0.5)
  })

  it('returns a valid zero model when there are no pairs', () => {
    const m = trainModel([])
    expect(m.weights.length).toBe(DIM)
    expect(m.weights.every(w => w === 0)).toBe(true)
    expect(m.bias).toBe(0)
    expect(m.trainedOn).toEqual({ games: 0, states: 0 })
  })
})

describe('buildTrainingPairs (over the real corpus)', () => {
  const entries = loadCorpus(defaultCorpusDir())

  it('labels every state from both seats and yields 86-length feature vectors', () => {
    if (!entries.length) return // corpus purged: nothing to check
    const { pairs, games, states } = buildTrainingPairs(entries)
    expect(games).toBeGreaterThan(0)
    expect(pairs.length).toBe(states * 2) // both seats per state
    for (const p of pairs) {
      expect(p.features.length).toBe(DIM)
      expect(p.features.every(Number.isFinite)).toBe(true)
      expect([0, 1]).toContain(p.label)
    }
  })

  it('discounts archived (older-meta) games below current-meta games', () => {
    if (!entries.length) return
    const current = buildTrainingPairs(entries)
    expect(current.pairs.every(p => p.weight === 1)).toBe(true) // stored entry is current-meta
    const archived: CorpusEntry[] = entries.map(e => ({ ...e, meta: { ...e.meta, archived: true } }))
    const older = buildTrainingPairs(archived)
    expect(older.pairs.every(p => p.weight === ARCHIVE_DISCOUNT)).toBe(true)
    expect(ARCHIVE_DISCOUNT).toBeLessThan(1)
  })

  it('trains end-to-end from the corpus into a well-formed model', () => {
    if (!entries.length) return
    const { pairs, games, states } = buildTrainingPairs(entries)
    const model = trainModel(pairs, {}, { games, states })
    expect(model.trainedOn).toEqual({ games, states })
    expect(model.featureVersion).toBe(FEATURE_VERSION)
    expect(model.weights.length).toBe(DIM)
    expect(model.weights.every(Number.isFinite)).toBe(true)
  })
})

describe('the shipped weights file, if present, matches the current feature layout', () => {
  it('is only trusted when its featureVersion equals the engine layout', () => {
    const path = defaultCorpusDir().replace(/corpus$/, 'models/weights.v1.json')
    if (!existsSync(path)) return
    const model = JSON.parse(readFileSync(path, 'utf8'))
    expect(model.weights.length).toBe(DIM)
    expect(model.featureVersion).toBe(FEATURE_VERSION)
  })
})
