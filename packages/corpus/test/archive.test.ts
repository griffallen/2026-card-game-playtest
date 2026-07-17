import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CARD_SET } from '@newgame/engine'
import { extractReplayBlocks, verifyReplay } from '../src/replay.ts'
import { archiveCardSet, ARCHIVE_SLUGS } from '../src/archive.ts'
import { collectFromSources } from '../src/collect.ts'
import { loadCorpus } from '../src/store.ts'
import { recordGame, asPaste } from './helpers.ts'

const clock = () => '2026-07-17T00:00:00.000Z'
const stalePaste = () =>
  readFileSync(fileURLToPath(new URL('./fixtures/griff-stale-paste.txt', import.meta.url)), 'utf8')

describe('archive card set', () => {
  it('holds the retired cards but never leaks them into the live pool', () => {
    // Doombringer was cut in the balance pass (a660cca) — it must stay out of playable decks.
    expect(CARD_SET.doombringer).toBeUndefined()
    expect(ARCHIVE_SLUGS.has('doombringer')).toBe(true)
    // The superset carries it for validation, without mutating the live pool.
    expect(archiveCardSet().doombringer).toBeDefined()
    expect(CARD_SET.doombringer).toBeUndefined()
  })

  it('replays a retired-card log byte-clean against the superset — the live set cannot', () => {
    const [{ block }] = extractReplayBlocks(stalePaste())
    expect(block.decks.A.cards).toContain('doombringer')

    const live = verifyReplay(block, { cardSet: CARD_SET })
    expect(live.ok).toBe(false)
    expect(live.errorStage).toBe('setup')
    expect(live.error).toMatch(/doombringer/)

    const arch = verifyReplay(block, { cardSet: archiveCardSet() })
    expect(arch.ok).toBe(true)
    expect(arch.terminal).toBe(true)
    expect(arch.actionsApplied).toBe(arch.totalActions)
  })
})

describe('collectFromSources — archived (retired-card) games', () => {
  let dir: string
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'corpus-archive-')) })
  afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

  it('collects a retired-card game and flags it archived', () => {
    const report = collectFromSources(dir, [{ text: stalePaste(), source: 'issue-98#stale' }], { clock })
    expect(report.rejected).toHaveLength(0)
    expect(report.collected).toHaveLength(1)
    expect(report.collected[0].archived).toBe(true)

    const [e] = loadCorpus(dir)
    expect(e.meta.archived).toBe(true)
    expect(e.meta.terminal).toBe(true)
    expect(e.meta.winnerName).toBe("Griff's Red")
  })

  it('a current-meta game collected in the same batch stays archived=false', () => {
    const report = collectFromSources(dir, [
      { text: stalePaste(), source: 'stale' },
      { text: asPaste(recordGame(7)), source: 'current' },
    ], { clock })
    expect(report.collected).toHaveLength(2)
    const byArchived = Object.fromEntries(loadCorpus(dir).map(e => [e.meta.archived, e]))
    expect(byArchived['true'].meta.source).toBe('stale')
    expect(byArchived['false'].meta.source).toBe('current')
  })

  it('still rejects a card in NEITHER the live set nor the archive', () => {
    const [{ block }] = extractReplayBlocks(stalePaste())
    const tampered = structuredClone(block)
    tampered.decks.A.cards = [...tampered.decks.A.cards, 'card-that-never-existed']
    const report = collectFromSources(dir, [{ text: JSON.stringify(tampered), source: 'x' }], { clock })
    expect(report.collected).toHaveLength(0)
    expect(report.rejected[0].reason).toMatch(/card-that-never-existed/)
  })
})
