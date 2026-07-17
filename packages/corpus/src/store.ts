import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, existsSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CorpusEntry, FingerprintFilter, ReplayBlock } from './types.ts'

/** Default corpus location: data/corpus at the repo root. */
export function defaultCorpusDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../..', 'data/corpus')
}

/** Deterministic JSON with sorted keys — so a game hashes the same regardless of key order. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>
    return `{${Object.keys(o).sort().map(k => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/**
 * A stable id for a game: its seed (human-readable) plus a short content hash of the whole
 * replay. Same paste -> same id (so re-collecting dedupes); different game -> different id.
 */
export function gameIdFor(block: ReplayBlock): string {
  const hash = createHash('sha256').update(stableStringify(block)).digest('hex').slice(0, 8)
  return `${block.seed}-${hash}`
}

export function entryPath(dir: string, entry: CorpusEntry): string {
  return join(dir, entry.meta.fingerprint.key, `${entry.meta.gameId}.json`)
}

export function writeEntry(dir: string, entry: CorpusEntry): string {
  const path = entryPath(dir, entry)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(entry, null, 2) + '\n')
  return path
}

export function entryExists(dir: string, entry: CorpusEntry): boolean {
  return existsSync(entryPath(dir, entry))
}

/** Load every entry across all fingerprint subdirs. Missing dir -> []. Unreadable files skipped. */
export function loadCorpus(dir: string): CorpusEntry[] {
  if (!existsSync(dir)) return []
  const out: CorpusEntry[] = []
  for (const sub of readdirSync(dir)) {
    const subPath = join(dir, sub)
    if (!statSync(subPath).isDirectory()) continue
    for (const file of readdirSync(subPath)) {
      if (!file.endsWith('.json')) continue
      try {
        const e = JSON.parse(readFileSync(join(subPath, file), 'utf8')) as CorpusEntry
        if (e?.meta?.gameId && e.replay) out.push(e)
      } catch { /* skip unreadable/partial */ }
    }
  }
  return out.sort((a, b) => a.meta.collectedOrder - b.meta.collectedOrder)
}

export interface CorpusGroup {
  key: string
  rules: string
  engine: string
  cards: string
  count: number
  terminal: number
  winners: { seat0: number; seat1: number; none: number }
}

/** Summarize the corpus grouped by fingerprint — the input to a purge decision. */
export function listCorpus(dir: string): CorpusGroup[] {
  const groups = new Map<string, CorpusGroup>()
  for (const e of loadCorpus(dir)) {
    const f = e.meta.fingerprint
    let g = groups.get(f.key)
    if (!g) {
      g = { key: f.key, rules: f.rules, engine: f.engine, cards: f.cards, count: 0, terminal: 0, winners: { seat0: 0, seat1: 0, none: 0 } }
      groups.set(f.key, g)
    }
    g.count++
    if (e.meta.terminal) g.terminal++
    if (e.meta.winner === 0) g.winners.seat0++
    else if (e.meta.winner === 1) g.winners.seat1++
    else g.winners.none++
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key))
}

/** Does an entry's fingerprint match every field the filter specifies? */
export function matchesFilter(entry: CorpusEntry, filter: FingerprintFilter): boolean {
  const f = entry.meta.fingerprint
  return (filter.key === undefined || f.key === filter.key)
    && (filter.rules === undefined || f.rules === filter.rules)
    && (filter.engine === undefined || f.engine === filter.engine)
    && (filter.cards === undefined || f.cards === filter.cards)
}

export interface Selector {
  mode: 'keep' | 'drop'
  filter: FingerprintFilter
}

/** Partition entries into what a selector keeps vs drops (pure — no filesystem). */
export function selectEntries(entries: CorpusEntry[], selector: Selector): { keep: CorpusEntry[]; drop: CorpusEntry[] } {
  const keep: CorpusEntry[] = []
  const drop: CorpusEntry[] = []
  for (const e of entries) {
    const hit = matchesFilter(e, selector.filter)
    // keep-mode: a hit stays, a miss is dropped. drop-mode: a hit is dropped, a miss stays.
    const keeping = selector.mode === 'keep' ? hit : !hit
    ;(keeping ? keep : drop).push(e)
  }
  return { keep, drop }
}

export interface PurgeReport {
  kept: CorpusEntry[]
  dropped: CorpusEntry[]
  dryRun: boolean
}

/** Apply a selector to the corpus on disk: delete the dropped entries and prune empty dirs. */
export function purgeCorpus(dir: string, selector: Selector, opts: { dryRun?: boolean } = {}): PurgeReport {
  const dryRun = opts.dryRun ?? false
  const { keep, drop } = selectEntries(loadCorpus(dir), selector)
  if (!dryRun) {
    for (const e of drop) rmSync(entryPath(dir, e), { force: true })
    pruneEmptyDirs(dir)
  }
  return { kept: keep, dropped: drop, dryRun }
}

function pruneEmptyDirs(dir: string): void {
  if (!existsSync(dir)) return
  for (const sub of readdirSync(dir)) {
    const subPath = join(dir, sub)
    if (statSync(subPath).isDirectory() && readdirSync(subPath).length === 0) {
      rmSync(subPath, { recursive: true, force: true })
    }
  }
}
