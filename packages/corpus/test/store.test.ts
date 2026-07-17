import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  gameIdFor, writeEntry, loadCorpus, listCorpus, selectEntries, purgeCorpus,
} from '../src/store.ts'
import type { CorpusEntry, Fingerprint } from '../src/types.ts'
import { recordGame } from './helpers.ts'

let dir: string
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'corpus-store-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const fp = (over: Partial<Fingerprint> = {}): Fingerprint => ({
  key: 'rules-v3.0__engine-0.1.0__cards-aaaaaaaaaaaa',
  rules: 'v3.0', engine: '0.1.0', cards: 'aaaaaaaaaaaa', ...over,
})

const entry = (id: string, over: Partial<Fingerprint> = {}, winner: 0 | 1 | null = 0): CorpusEntry => {
  const f = fp(over)
  return {
    meta: {
      gameId: id, fingerprint: f, rules: f.rules, winner, winnerName: winner === null ? null : 'X',
      winReason: winner === null ? null : 'life', rounds: 5, actionCount: 10, terminal: winner !== null,
      archived: false, source: 'test', collectedOrder: 0,
    },
    replay: { seed: 1, rules: f.rules, mulligan: false, decks: { A: { name: 'A', slug: 'a', cards: [] }, B: { name: 'B', slug: 'b', cards: [] } }, actions: [] },
  }
}

describe('gameIdFor', () => {
  it('is deterministic and carries the seed, independent of key order', () => {
    const b = recordGame(7)
    const { winner: _w, rounds: _r, ...clean } = b
    const reordered = { actions: clean.actions, decks: clean.decks, rules: clean.rules, seed: clean.seed, mulligan: clean.mulligan, policies: clean.policies }
    expect(gameIdFor(clean)).toBe(gameIdFor(reordered))
    expect(gameIdFor(clean).startsWith('7-')).toBe(true)
  })

  it('differs for different games', () => {
    expect(gameIdFor(recordGame(1))).not.toBe(gameIdFor(recordGame(2)))
  })
})

describe('write + load round-trip', () => {
  it('stores under data/corpus/<key>/<gameId>.json and loads it back', () => {
    const e = entry('g1')
    writeEntry(dir, e)
    expect(existsSync(join(dir, e.meta.fingerprint.key, 'g1.json'))).toBe(true)
    const loaded = loadCorpus(dir)
    expect(loaded).toHaveLength(1)
    expect(loaded[0].meta.gameId).toBe('g1')
    expect(loaded[0].replay.rules).toBe('v3.0')
  })

  it('loadCorpus returns [] for a missing directory', () => {
    expect(loadCorpus(join(dir, 'nope'))).toEqual([])
  })
})

describe('listCorpus', () => {
  it('groups by fingerprint and breaks down winners', () => {
    writeEntry(dir, entry('a', {}, 0))
    writeEntry(dir, entry('b', {}, 1))
    writeEntry(dir, entry('c', { key: 'old', cards: 'bbbbbbbbbbbb' }, null))
    const groups = listCorpus(dir)
    expect(groups).toHaveLength(2)
    const cur = groups.find(g => g.key.includes('aaaa'))!
    expect(cur.count).toBe(2)
    expect(cur.winners).toEqual({ seat0: 1, seat1: 1, none: 0 })
    const old = groups.find(g => g.key === 'old')!
    expect(old.count).toBe(1)
    expect(old.winners.none).toBe(1)
  })
})

describe('selectEntries / purgeCorpus', () => {
  const seed = () => {
    writeEntry(dir, entry('cur1', {}))
    writeEntry(dir, entry('cur2', {}))
    writeEntry(dir, entry('old1', { key: 'old', cards: 'bbbbbbbbbbbb' }))
  }

  it('keeps only entries matching a cards fingerprint (drop everything not matching X)', () => {
    const entries = [entry('cur1'), entry('old1', { key: 'old', cards: 'bbbbbbbbbbbb' })]
    const { keep, drop } = selectEntries(entries, { mode: 'keep', filter: { cards: 'aaaaaaaaaaaa' } })
    expect(keep.map(e => e.meta.gameId)).toEqual(['cur1'])
    expect(drop.map(e => e.meta.gameId)).toEqual(['old1'])
  })

  it('purge --keep drops the non-matching files on disk and prunes empty dirs', () => {
    seed()
    const report = purgeCorpus(dir, { mode: 'keep', filter: { cards: 'aaaaaaaaaaaa' } })
    expect(report.dropped.map(e => e.meta.gameId).sort()).toEqual(['old1'])
    expect(report.kept.map(e => e.meta.gameId).sort()).toEqual(['cur1', 'cur2'])
    expect(existsSync(join(dir, 'old'))).toBe(false)
    expect(loadCorpus(dir).map(e => e.meta.gameId).sort()).toEqual(['cur1', 'cur2'])
  })

  it('purge --drop removes matching entries', () => {
    seed()
    const report = purgeCorpus(dir, { mode: 'drop', filter: { rules: 'v3.0' } })
    // every seeded entry is v3.0, so all are dropped
    expect(report.kept).toHaveLength(0)
    expect(loadCorpus(dir)).toHaveLength(0)
  })

  it('dry-run reports without deleting', () => {
    seed()
    const report = purgeCorpus(dir, { mode: 'keep', filter: { cards: 'aaaaaaaaaaaa' } }, { dryRun: true })
    expect(report.dryRun).toBe(true)
    expect(report.dropped.map(e => e.meta.gameId)).toEqual(['old1'])
    expect(loadCorpus(dir)).toHaveLength(3) // nothing deleted
  })
})
