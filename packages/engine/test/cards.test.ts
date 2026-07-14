import { describe, expect, it } from 'vitest'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { validateCardSet } from '../src/validate.ts'
import { validateDeck } from '../src/setup.ts'
import { DEFAULT_RULES } from '../src/rules.ts'

describe('card set', () => {
  it('holds the full pool (37 red, 48 yellow, 36 purple), unique slugs', () => {
    const cards = Object.values(CARD_SET)
    expect(cards.filter(c => c.color === 'red').length).toBe(37)   // +1: Reckless Abandon (issue #45)
    expect(cards.filter(c => c.color === 'yellow').length).toBe(48)
    expect(cards.filter(c => c.color === 'purple').length).toBe(36)
    expect(Object.keys(CARD_SET).length).toBe(121)
  })

  it('passes structural validation — the admin-edit safety contract', () => {
    expect(validateCardSet(CARD_SET)).toEqual([])
  })

  it('rejects malformed cards (the contract actually bites)', () => {
    const bad = structuredClone(CARD_SET)
    bad['searing-bolt'].onPlay = [{ op: 'damage', t: 'chosen1', n: 2 }] as never
    bad['vanguard-sentinel'].kw = [{ k: 'lifelink' }] as never
    const errors = validateCardSet(bad)
    expect(errors.some(e => e.includes('chosen1'))).toBe(true)
    expect(errors.some(e => e.includes('lifelink'))).toBe(true)
  })

  it('every card has art on disk (jpg crops; svg for the veil placeholder set)', () => {
    const dir = fileURLToPath(new URL('../../../apps/web/public/cards/', import.meta.url))
    const files = new Set(readdirSync(dir))
    const missing = Object.keys(CARD_SET).filter(slug => !files.has(`${slug}.jpg`) && !files.has(`${slug}.svg`))
    expect(missing).toEqual([])
  })
})

describe('prebuilt decks', () => {
  it('all prebuilt decks are legal, min-48 lists (issue #30: larger is allowed)', () => {
    expect(PREBUILT_DECKS.length).toBe(5)   // +Griff's Red (#50), +Griff's Yellow (#81)
    for (const deck of PREBUILT_DECKS) {
      const slugs = deckSlugs(deck)
      expect(slugs.length).toBeGreaterThanOrEqual(48)
      expect(validateDeck(slugs, CARD_SET, DEFAULT_RULES)).toEqual([])
    }
  })
})
