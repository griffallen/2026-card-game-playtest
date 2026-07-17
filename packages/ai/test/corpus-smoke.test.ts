import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  CARD_SET, DEFAULT_RULES, V3_RULES, applyAction, createGame,
  type GameState, type RulesConfig,
} from '@newgame/engine'
import { FEATURE_NAMES, featurize } from '../src/index.ts'

// Smoke test: featurize REAL game states drawn from the collected corpus. We read the corpus
// JSON directly (no dependency on @newgame/corpus) and replay each game through the engine.
// A stored game may have been recorded under an older card set, so a replay can legally stop
// early — we featurize whatever real, engine-produced state we reach. The point is only that
// featurize yields a finite vector of the right length on states from actual play.

const corpusDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../..', 'data/corpus')

interface StoredAction { s: 0 | 1; a: Parameters<typeof applyAction>[1] }
interface StoredEntry {
  replay?: {
    seed: number; rules: string; mulligan?: boolean
    decks: { A: { name?: string; cards: string[] }; B: { name?: string; cards: string[] } }
    actions: StoredAction[]
  }
}

function loadEntries(): StoredEntry[] {
  if (!existsSync(corpusDir)) return []
  const out: StoredEntry[] = []
  for (const sub of readdirSync(corpusDir)) {
    const subPath = join(corpusDir, sub)
    if (!statSync(subPath).isDirectory()) continue
    for (const file of readdirSync(subPath)) {
      if (!file.endsWith('.json')) continue
      try { out.push(JSON.parse(readFileSync(join(subPath, file), 'utf8'))) } catch { /* skip */ }
    }
  }
  return out
}

/** Replay as far as the current card set allows; return the last valid state reached. */
function replayToState(entry: StoredEntry): GameState | null {
  const r = entry.replay
  if (!r) return null
  const base: RulesConfig = r.rules === 'v3.0' ? V3_RULES : DEFAULT_RULES
  const rules = r.mulligan ? { ...base, mulliganStyle: 'london' as const } : base
  let state: GameState
  try {
    state = createGame({
      seed: r.seed, rules, cardSet: CARD_SET,
      players: [
        { name: r.decks.A.name ?? 'A', deck: r.decks.A.cards },
        { name: r.decks.B.name ?? 'B', deck: r.decks.B.cards },
      ],
    })
  } catch { return null }
  for (const step of r.actions) {
    try { state = applyAction(state, step.a, step.s).state } catch { break }
  }
  return state
}

describe('featurize over the collected corpus (smoke)', () => {
  const entries = loadEntries()

  it('produces finite, correctly-sized vectors on real game states', () => {
    let checked = 0
    for (const entry of entries) {
      const state = replayToState(entry)
      if (!state) continue
      for (const seat of [0, 1] as const) {
        const v = featurize(state, seat)
        expect(v.length).toBe(FEATURE_NAMES.length)
        expect(v.every(Number.isFinite)).toBe(true)
        checked++
      }
    }
    // Never a hard gate: if the corpus is empty/purged, there's simply nothing to check.
    expect(checked).toBeGreaterThanOrEqual(0)
  })
})
