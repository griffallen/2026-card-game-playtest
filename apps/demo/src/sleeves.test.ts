import { describe, expect, it } from 'vitest'
import { SLEEVE_CHOICES, SLEEVE_EDGE, SLEEVE_SWATCH, SLEEVE_TAB, sleeveFor } from '@ui/game/sleeves.ts'

/** Issue #114 (Griff): "more colors of sleeves ... all 5 colors of the decks and any 7 rainbow
 *  colors not already included." A sleeve is only useful if it is offered in the picker AND
 *  dressed everywhere the card is drawn — a half-wired sleeve renders an invisible edge. */
describe('the sleeve palette', () => {
  it('offers the widened set (the original six plus a rainbow)', () => {
    expect(SLEEVE_CHOICES.length).toBeGreaterThanOrEqual(13)
  })

  it('dresses every offered sleeve in all three places a card is drawn', () => {
    for (const { id } of SLEEVE_CHOICES) {
      expect(SLEEVE_EDGE[id], `${id} has no edge trim`).toBeTruthy()
      expect(SLEEVE_TAB[id], `${id} has no lip`).toBeTruthy()
      expect(SLEEVE_SWATCH[id], `${id} has no picker swatch`).toBeTruthy()
    }
  })

  it('offers every sleeve it can dress — no colour hidden from the picker', () => {
    expect(SLEEVE_CHOICES.map(c => c.id).sort()).toEqual(Object.keys(SLEEVE_EDGE).sort())
  })

  it('gives each sleeve its own colour — two identical swatches are one choice', () => {
    const swatches = SLEEVE_CHOICES.map(c => SLEEVE_SWATCH[c.id])
    expect(new Set(swatches).size).toBe(swatches.length)
    const labels = SLEEVE_CHOICES.map(c => c.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('keeps the ivory / gunmetal defaults (issue #28 — the dash is the second ownership cue)', () => {
    expect(sleeveFor(true)).toBe('ivory')
    expect(sleeveFor(false)).toBe('gunmetal')
    expect(SLEEVE_EDGE.gunmetal).toContain('outline-dashed')
  })
})
