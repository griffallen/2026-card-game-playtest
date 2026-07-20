/**
 * The rules version and the engine's package version are ONE number.
 *
 * The AI corpus fingerprints every game by `engineVersion` (packages/corpus/src/fingerprint.ts).
 * That number sat at 0.1.0 from the start while combat behaviour changed twice, so every corpus
 * game shared a fingerprint and pre- and post-change games were indistinguishable — the exact
 * failure issue #119 was raised to prevent. Keeping the two equal is what makes the fingerprint
 * mean something, so it is pinned rather than trusted.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { RULES_VERSION } from '../src/rules.ts'

describe('rules version', () => {
  it('equals the engine package version', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    expect(pkg.version).toBe(RULES_VERSION)
  })

  it('is a plain semver triple — MINOR moves when combat behaviour changes (#119)', () => {
    expect(RULES_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
