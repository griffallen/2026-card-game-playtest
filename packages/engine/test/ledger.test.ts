import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { CARD_SET } from '../src/cards/index.ts'
import { parseCardFile } from '../src/cards/cardfile.ts'

describe('card ledger', () => {
  it('generated.json matches data/cards/ exactly (run `npm run cards` after editing cards)', () => {
    const seen = new Set<string>()
    for (const color of ['red', 'yellow'] as const) {
      const dir = new URL(`../../../data/cards/${color}/`, import.meta.url)
      for (const file of readdirSync(dir)) {
        if (!file.endsWith('.md')) continue
        const slug = file.slice(0, -3)
        const { card, errors } = parseCardFile(readFileSync(new URL(file, dir), 'utf8'), slug, color)
        expect(errors, `${slug} should parse`).toEqual([])
        expect(CARD_SET[slug], `${slug} missing from generated.json`).toBeDefined()
        expect(card!.def).toEqual(CARD_SET[slug])
        seen.add(slug)
      }
    }
    expect(Object.keys(CARD_SET).sort()).toEqual([...seen].sort())
  })
})
