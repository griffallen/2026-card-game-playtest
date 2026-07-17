import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { collectFromSources } from '../src/collect.ts'
import { loadCorpus } from '../src/store.ts'
import { recordGame, asPaste } from './helpers.ts'

let dir: string
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'corpus-collect-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const clock = () => '2026-07-17T00:00:00.000Z'
const stalePaste = () =>
  readFileSync(fileURLToPath(new URL('./fixtures/griff-stale-paste.txt', import.meta.url)), 'utf8')

describe('collectFromSources', () => {
  it('validates, version-stamps, and files a good game', () => {
    const block = recordGame(7)
    const report = collectFromSources(dir, [{ text: asPaste(block), source: 'issue-98#c1' }], { clock })
    expect(report.collected).toHaveLength(1)
    expect(report.rejected).toHaveLength(0)

    const [e] = loadCorpus(dir)
    expect(e.meta.source).toBe('issue-98#c1')
    expect(e.meta.rules).toBe('v3.0')
    expect(e.meta.terminal).toBe(true)
    expect(e.meta.winner).toBe(block.winner)
    expect(e.meta.collectedAt).toBe('2026-07-17T00:00:00.000Z')
    expect(e.meta.fingerprint.cards).toMatch(/^[0-9a-f]{12}$/)
    // stamped with the version it verified under — the current engine
    expect(e.meta.fingerprint.rules).toBe('v3.0')
    // a live-pool game is current-meta, never flagged archived
    expect(e.meta.archived).toBe(false)
  })

  it('with archive disabled, an un-replayable (stale-cardset) paste bounces (pre-#97 behavior)', () => {
    const report = collectFromSources(dir, [{ text: stalePaste(), source: 'issue-98#stale' }], { clock, archive: null })
    expect(report.collected).toHaveLength(0)
    expect(report.rejected).toHaveLength(1)
    expect(report.rejected[0].reason).toMatch(/doombringer/)
    expect(loadCorpus(dir)).toHaveLength(0)
  })

  it('ignores sources with no replay block', () => {
    const report = collectFromSources(dir, [{ text: 'just chatter', source: 'noise' }], { clock })
    expect(report.collected).toHaveLength(0)
    expect(report.rejected).toHaveLength(0)
    expect(report.skipped).toHaveLength(0)
  })

  it('dedupes an identical game filed twice', () => {
    const block = recordGame(7)
    const src = [{ text: asPaste(block), source: 'a' }]
    collectFromSources(dir, src, { clock })
    const second = collectFromSources(dir, [{ text: asPaste(block), source: 'b' }], { clock })
    expect(second.collected).toHaveLength(0)
    expect(second.skipped).toHaveLength(1)
    expect(loadCorpus(dir)).toHaveLength(1)
  })

  it('assigns monotonic collection order across a batch', () => {
    const report = collectFromSources(dir, [
      { text: asPaste(recordGame(1)), source: 's1' },
      { text: asPaste(recordGame(2)), source: 's2' },
    ], { clock })
    expect(report.collected).toHaveLength(2)
    const orders = loadCorpus(dir).map(e => e.meta.collectedOrder).sort((a, b) => a - b)
    expect(orders).toEqual([0, 1])
  })

  it('with requireWinner, drops a truncated (non-terminal) game', () => {
    const block = recordGame(42)
    const truncated = { ...block, actions: block.actions.slice(0, 10) }
    const report = collectFromSources(dir, [{ text: asPaste(truncated), source: 't' }], { clock, requireWinner: true })
    expect(report.collected).toHaveLength(0)
    expect(report.rejected[0].reason).toMatch(/no winner|not.*finish|terminal/i)
  })
})
