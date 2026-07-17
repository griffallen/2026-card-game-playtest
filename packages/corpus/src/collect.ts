import type { CardSet } from '@newgame/engine'
import { extractReplayBlocks, verifyReplay } from './replay.ts'
import { computeFingerprint, repoFingerprintSources } from './fingerprint.ts'
import { gameIdFor, writeEntry, entryExists, loadCorpus } from './store.ts'
import type { CorpusEntry } from './types.ts'

/** One text to mine for replay blocks, tagged with where it came from. */
export interface CollectSource {
  text: string
  /** An issue-comment URL, a file path, "stdin" — recorded in each entry's metadata. */
  source: string
}

export interface CollectOpts {
  cardSet?: CardSet
  /** Injectable wall-clock (ISO string) — omit to record no timestamp. Tests pass a fixed clock. */
  clock?: () => string | undefined
  /** Reject byte-clean-but-unfinished games (a truncated paste). Default: accept them. */
  requireWinner?: boolean
  /** Repo root for the version fingerprint sources. Defaults to the checked-out repo. */
  root?: string
}

export interface CollectReport {
  collected: { source: string; gameId: string; key: string; winner: number | null }[]
  skipped: { source: string; gameId: string; reason: string }[]
  rejected: { source: string; seed: number | null; reason: string }[]
}

/**
 * The collect step: for each source, pull out every replay block, replay it byte-clean through
 * the engine (rejecting junk / un-replayable / stale-cardset pastes), stamp the survivors with
 * the version they verified under, and file them into the versioned corpus. Deduped by game id.
 */
export function collectFromSources(dir: string, sources: CollectSource[], opts: CollectOpts = {}): CollectReport {
  const report: CollectReport = { collected: [], skipped: [], rejected: [] }
  const { catalog, engineVersion } = repoFingerprintSources(opts.root)
  const clock = opts.clock ?? (() => new Date().toISOString())

  // Monotonic order continues from whatever is already stored, and advances as we file.
  let order = loadCorpus(dir).length
  // Dedupe within this batch too (same game pasted in two comments).
  const seenThisRun = new Set<string>()

  for (const src of sources) {
    for (const { block } of extractReplayBlocks(src.text)) {
      const verdict = verifyReplay(block, { cardSet: opts.cardSet })
      if (!verdict.ok) {
        report.rejected.push({ source: src.source, seed: block.seed, reason: verdict.error ?? 'replay failed' })
        continue
      }
      if (opts.requireWinner && !verdict.terminal) {
        report.rejected.push({ source: src.source, seed: block.seed, reason: 'game has no winner (truncated / not terminal)' })
        continue
      }

      const gameId = gameIdFor(block)
      const fingerprint = computeFingerprint({ rules: block.rules, catalog, engineVersion })
      const entry: CorpusEntry = {
        meta: {
          gameId,
          fingerprint,
          rules: block.rules,
          winner: verdict.winner,
          winnerName: verdict.winnerName,
          winReason: verdict.winReason,
          rounds: verdict.rounds,
          actionCount: block.actions.length,
          terminal: verdict.terminal,
          source: src.source,
          collectedOrder: order,
          ...(clock() !== undefined ? { collectedAt: clock() } : {}),
        },
        replay: block,
      }

      if (seenThisRun.has(gameId) || entryExists(dir, entry)) {
        report.skipped.push({ source: src.source, gameId, reason: 'already in corpus' })
        continue
      }
      writeEntry(dir, entry)
      seenThisRun.add(gameId)
      report.collected.push({ source: src.source, gameId, key: fingerprint.key, winner: verdict.winner })
      order++
    }
  }
  return report
}
