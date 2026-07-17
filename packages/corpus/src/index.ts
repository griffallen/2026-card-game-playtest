// @newgame/corpus — the versioned game-log corpus (issue #97, step 1).
//
// A library + thin CLI: collect replay logs pasted into issue #98, validate each by replaying
// it byte-clean through the engine, version-stamp it with a fingerprint, and file it so that
// "purge old-version logs" is a filter query. A later training step imports `loadCorpus`.

export type {
  ReplayBlock, ReplayStep, ReplayDeck, Fingerprint, VerifyResult,
  EntryMeta, CorpusEntry, FingerprintFilter,
} from './types.ts'

export { extractReplayBlocks, parseReplayBlock, verifyReplay, rulesForBlock } from './replay.ts'
export { computeFingerprint, currentFingerprint, repoFingerprintSources, type FingerprintInput } from './fingerprint.ts'
export {
  loadCorpus, listCorpus, selectEntries, purgeCorpus, matchesFilter,
  gameIdFor, writeEntry, entryPath, entryExists, defaultCorpusDir,
  type CorpusGroup, type Selector, type PurgeReport,
} from './store.ts'
export { collectFromSources, type CollectSource, type CollectOpts, type CollectReport } from './collect.ts'
export { ARCHIVE_CARDS, ARCHIVE_SLUGS, archiveCardSet, loadArchiveCards } from './archive.ts'
