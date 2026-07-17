import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CARD_SET, parseCardFile, type CardSet, type Color } from '@newgame/engine'

/** Repo root, resolved from this file: packages/corpus/src -> ../../.. */
function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
}

/** Colors mirrored under data/cards/_archive/<color>/. Same layout as the live pool. */
const ARCHIVE_COLORS: Color[] = ['red', 'yellow', 'purple']

/**
 * Compile the RETIRED-card ledger: data/cards/_archive/<color>/<slug>.md — the exact per-card
 * format the live pool uses, for cards the balance pass CUT (e.g. Doombringer, dropped in
 * commit a660cca). These files are deliberately NOT under data/cards/<color>/, so cards-build.ts
 * never sees them and they never enter generated.json / a playable deck. The corpus reads them
 * ONLY to validate historical logs that were played before the card was cut. Deterministic:
 * same files -> same defs, no clock, no rng.
 */
export function loadArchiveCards(root = repoRoot()): CardSet {
  const out: CardSet = {}
  for (const color of ARCHIVE_COLORS) {
    const dir = resolve(root, 'data/cards/_archive', color)
    if (!existsSync(dir)) continue
    for (const file of readdirSync(dir).sort()) {
      if (!file.endsWith('.md')) continue
      const slug = file.slice(0, -3)
      const { card, errors } = parseCardFile(readFileSync(join(dir, file), 'utf8'), slug, color)
      if (errors.length) throw new Error(`archive card ${color}/${slug}: ${errors.join('; ')}`)
      if (card) out[card.def.slug] = card.def
    }
  }
  return out
}

/** The retired cards, compiled once from the checked-out repo. */
export const ARCHIVE_CARDS: CardSet = loadArchiveCards()

/** Slugs that live ONLY in the archive (retired) — the tell that a log is older-meta. */
export const ARCHIVE_SLUGS: ReadonlySet<string> = new Set(Object.keys(ARCHIVE_CARDS))

/**
 * A validation-ONLY superset: the live pool PLUS the retired cards. Passed to verifyReplay so a
 * log that references a cut card still replays through the engine. Live defs WIN on any slug
 * collision, so a card that was retired and later re-added lives by its current def — the frozen
 * archive copy only ever fills a gap the live set no longer has. This never touches CARD_SET,
 * the demo, or the deckbuilder; it exists solely to salvage old logs for the corpus.
 */
export function archiveCardSet(base: CardSet = CARD_SET): CardSet {
  return { ...ARCHIVE_CARDS, ...base }
}
