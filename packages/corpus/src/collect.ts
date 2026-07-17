import { CARD_SET, type CardSet } from '@newgame/engine'
import { extractReplayBlocks, verifyReplay } from './replay.ts'
import { archiveCardSet } from './archive.ts'
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
  /** The LIVE card pool a current-meta game must validate against. Default: CARD_SET. */
  cardSet?: CardSet
  /**
   * The validation-only superset (live pool + retired cards) used to SALVAGE a log that references
   * a card the balance pass cut — those games collect, flagged `archived`. Default:
   * `archiveCardSet(live)`. Pass `null` to disable archive collection (a cut-card log then bounces,
   * the pre-#97 behavior).
   */
  archive?: CardSet | null
  /** Injectable wall-clock (ISO string) — omit to record no timestamp. Tests pass a fixed clock. */
  clock?: () => string | undefined
  /** Reject byte-clean-but-unfinished games (a truncated paste). Default: accept them. */
  requireWinner?: boolean
  /** Repo root for the version fingerprint sources. Defaults to the checked-out repo. */
  root?: string
}

export interface CollectReport {
  collected: { source: string; gameId: string; key: string; winner: number | null; archived: boolean }[]
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

  const liveSet = opts.cardSet ?? CARD_SET
  // The salvage superset (live + retired). `null` disables archive collection entirely.
  const archiveSet = opts.archive === null ? null : (opts.archive ?? archiveCardSet(liveSet))

  // Monotonic order continues from whatever is already stored, and advances as we file.
  let order = loadCorpus(dir).length
  // Dedupe within this batch too (same game pasted in two comments).
  const seenThisRun = new Set<string>()

  for (const src of sources) {
    for (const { block } of extractReplayBlocks(src.text)) {
      // Try the live pool first: current-meta games collect exactly as before, untouched by the
      // archive. Only a log that BOUNCES off the live set (a retired card) falls through to the
      // archive superset — and if that salvages it, it is filed as older-meta (`archived`). The
      // archive is a strict superset of live, so its replay always gets at least as far; on a
      // double failure we report ITS error, which is the deeper, honest reason (e.g. a setup that
      // only an older engine produced — "not your action window" — rather than the retired card
      // that merely happened to bounce first at the deck gate).
      const liveVerdict = verifyReplay(block, { cardSet: liveSet })
      let verdict = liveVerdict
      let archived = false
      if (!liveVerdict.ok && archiveSet) {
        verdict = verifyReplay(block, { cardSet: archiveSet })
        archived = verdict.ok
      }
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
          archived,
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
      report.collected.push({ source: src.source, gameId, key: fingerprint.key, winner: verdict.winner, archived })
      order++
    }
  }
  return report
}
