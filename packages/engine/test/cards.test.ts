import { describe, expect, it } from 'vitest'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CARD_SET, RED_CARDS, YELLOW_CARDS } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { validateCardSet } from '../src/validate.ts'
import { validateDeck } from '../src/setup.ts'
import { DEFAULT_RULES } from '../src/rules.ts'

describe('card set', () => {
  it('holds all 84 sheet cards (36 red, 48 yellow), unique slugs', () => {
    expect(RED_CARDS.length).toBe(36)
    expect(YELLOW_CARDS.length).toBe(48)
    expect(Object.keys(CARD_SET).length).toBe(84)
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

  it('every card has its sliced art crop on disk', () => {
    const dir = fileURLToPath(new URL('../../../apps/web/public/cards/', import.meta.url))
    const files = new Set(readdirSync(dir))
    const missing = Object.keys(CARD_SET).filter(slug => !files.has(`${slug}.jpg`))
    expect(missing).toEqual([])
  })
})

describe('prebuilt decks', () => {
  it('both decks are legal 48-card lists', () => {
    for (const deck of PREBUILT_DECKS) {
      const slugs = deckSlugs(deck)
      expect(slugs.length).toBe(48)
      expect(validateDeck(slugs, CARD_SET, DEFAULT_RULES)).toEqual([])
    }
  })
})
