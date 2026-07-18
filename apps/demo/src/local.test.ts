import { describe, expect, it } from 'vitest'
import { deckSlugs } from '@newgame/engine'
import { DEMO_CARDS, seatedDeckCards } from './local.ts'

// Issue #98 — the replay recorder must record the EXACT card list createGame is seated with.
// `newLocalGame` seats a deck through liveSlugs, which drops any slug the live set no longer has
// (issue #111 — e.g. Doombringer, cut in the balance pass). The "Copy Chronicle" recorder used
// the raw, UNFILTERED deckSlugs, so a saved deck that still named a cut card got recorded two
// cards longer than it was played. That extra length reshuffles the opening hands AND, because
// the shuffle consumes one RNG advance per card, shifts the seed state that derives the first
// player — so every recorded action lands in the wrong game and the collector bounces it with
// "not your action window" / "card is not in your hand". seatedDeckCards is the one shared
// resolver both the engine seat and the recorder use, so the recorded deck can never diverge
// from the played deck again.
describe('seatedDeckCards — recorder/engine deck parity (issue #98)', () => {
  const deckWithCutCard = { cards: [{ slug: 'inquisitor', count: 1 }, { slug: 'doombringer', count: 2 }] }

  it('drops a cut card the live set no longer has', () => {
    expect(DEMO_CARDS['doombringer']).toBeUndefined() // doombringer was retired to the archive
    expect(seatedDeckCards(deckWithCutCard, 'X')).toEqual(['inquisitor'])
  })

  it('records only slugs that exist in the live set — so createGame never bounces the deck', () => {
    const cards = seatedDeckCards(deckWithCutCard, 'X')
    expect(cards.every(slug => DEMO_CARDS[slug])).toBe(true)
  })

  it('is exactly the filter the engine seat applies (liveSlugs(deckSlugs(deck)))', () => {
    // The raw, unfiltered list the OLD recorder wrote — longer than what was played.
    const rawRecorded = deckSlugs(deckWithCutCard)
    expect(rawRecorded).toEqual(['inquisitor', 'doombringer', 'doombringer'])
    // The fixed recorder / engine seat agree, and are shorter by exactly the cut cards.
    expect(seatedDeckCards(deckWithCutCard, 'X')).toEqual(rawRecorded.filter(s => DEMO_CARDS[s]))
  })
})
