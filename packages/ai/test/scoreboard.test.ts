import { describe, expect, it } from 'vitest'
import { loadCorpus, defaultCorpusDir } from '@newgame/corpus'
import { FEATURE_NAMES, FEATURE_VERSION } from '../src/index.ts'
import type { LinearModel } from '../src/infer.ts'
import { runScoreboard } from '../src/scoreboard.ts'
import { buildTrainingPairs, trainModel } from '../src/train.ts'

function zeroModel(): LinearModel {
  return { featureVersion: FEATURE_VERSION, weights: new Array(FEATURE_NAMES.length).fill(0), bias: 0 }
}

describe('runScoreboard', () => {
  it('plays a fixed set of seeded games and returns a well-formed record', () => {
    const seeds = [1, 2, 3, 4]
    const r = runScoreboard(zeroModel(), { seeds })
    expect(r.games).toBe(seeds.length)
    expect(r.evalWins + r.heuristicWins + r.draws).toBe(seeds.length)
    expect(r.winRate).toBeGreaterThanOrEqual(0)
    expect(r.winRate).toBeLessThanOrEqual(1)
    expect(r.avgRounds).toBeGreaterThan(0)
    expect(r.avgActions).toBeGreaterThan(0)
    expect(r.record).toMatch(/^\d+-\d+-\d+$/)
  })

  it('is deterministic — the same seeds and model reproduce the same board', () => {
    const seeds = [7, 8, 9]
    const a = runScoreboard(zeroModel(), { seeds })
    const b = runScoreboard(zeroModel(), { seeds })
    expect(a).toEqual(b)
  })
})

describe('train -> scoreboard pipeline (end-to-end smoke, no quality claims)', () => {
  it('runs the whole pipeline over the real corpus deterministically', () => {
    const entries = loadCorpus(defaultCorpusDir())
    if (!entries.length) return // corpus purged
    const { pairs, games, states } = buildTrainingPairs(entries)
    const model = trainModel(pairs, {}, { games, states })
    const seeds = [1, 2]
    const a = runScoreboard(model, { seeds })
    const b = runScoreboard(model, { seeds })
    expect(a).toEqual(b)                 // same trained model + seeds -> identical scoreboard
    expect(a.games).toBe(seeds.length)   // pipeline ran; we assert NOTHING about who won
  })
})
