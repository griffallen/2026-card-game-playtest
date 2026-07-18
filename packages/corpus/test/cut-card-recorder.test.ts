import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CARD_SET } from '@newgame/engine'
import { extractReplayBlocks, verifyReplay } from '../src/replay.ts'
import { archiveCardSet } from '../src/archive.ts'

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8')

// Issue #98 root cause — the "Copy Chronicle" recorder used to record a deck's RAW slugs, not the
// liveSlugs-filtered list the game was actually seated with. A saved deck that still named a cut
// card (Doombringer, retired in #111) therefore travelled two cards longer than it was played.
//
// This is a POST-cut game (seed 1844022163): Doombringer was already gone from the live set, so
// the demo dropped it and never dealt it — but the recorder wrote it into decks.B anyway. That is
// the tell that distinguishes it from the genuinely-old griff-stale-paste.txt game, where
// Doombringer really was in the set and really was played.
describe('cut-card recorder artifact replays wrong (issue #98)', () => {
  const [{ block }] = extractReplayBlocks(fixture('griff-cut-card-98.json'))

  it('carries the cut card only in the deck list, never actually dealt', () => {
    expect(block.decks.B.cards.filter(c => c === 'doombringer')).toHaveLength(2)
  })

  it('bounces at the ACTION stage under the archive superset — the exact symptom Griff hit', () => {
    // The collector, unable to seat the cut card on the live set, falls through to the archive
    // superset (Doombringer restored). That rebuilds the deck two cards longer than was played,
    // so the shuffle deals different opening hands and the seed picks a different first player —
    // and the very first recorded action lands in the wrong window.
    const res = verifyReplay(block, { cardSet: archiveCardSet() })
    expect(res.ok).toBe(false)
    expect(res.errorStage).toBe('action')
    expect(res.error).toMatch(/not your action window|card is not in your hand/)
  })

  it('replays byte-clean once the deck is filtered as the fixed recorder now emits it', () => {
    // seatedDeckCards (apps/demo) now drops the cut card before recording, so a fixed-recorder
    // paste carries exactly the deck that was played. Reproduce that here and the game verifies
    // clean against the LIVE set — no archive path, correctly NOT flagged archived.
    const filtered = {
      ...block,
      decks: {
        A: { ...block.decks.A, cards: block.decks.A.cards.filter(c => c !== 'doombringer') },
        B: { ...block.decks.B, cards: block.decks.B.cards.filter(c => c !== 'doombringer') },
      },
    }
    const res = verifyReplay(filtered, { cardSet: CARD_SET })
    expect(res.ok).toBe(true)
    expect(res.terminal).toBe(true)
    expect(res.actionsApplied).toBe(res.totalActions)
  })
})
