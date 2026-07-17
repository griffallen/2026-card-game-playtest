import { describe, expect, it } from 'vitest'
import { computeFingerprint, currentFingerprint, repoFingerprintSources } from '../src/fingerprint.ts'

describe('computeFingerprint', () => {
  const base = { rules: 'v3.0', engineVersion: '0.1.0', catalog: '{"a":1}' }

  it('is deterministic and combines all three axes into a directory-safe key', () => {
    const a = computeFingerprint(base)
    const b = computeFingerprint(base)
    expect(a).toEqual(b)
    expect(a.rules).toBe('v3.0')
    expect(a.engine).toBe('0.1.0')
    expect(a.cards).toMatch(/^[0-9a-f]{12}$/)
    expect(a.key).toContain('v3.0')
    expect(a.key).toContain('0.1.0')
    expect(a.key).toContain(a.cards)
    expect(a.key).toMatch(/^[A-Za-z0-9._-]+$/) // safe as a folder name
  })

  it('changes the cards hash and key when the catalog changes', () => {
    const a = computeFingerprint(base)
    const b = computeFingerprint({ ...base, catalog: '{"a":2}' })
    expect(b.cards).not.toBe(a.cards)
    expect(b.key).not.toBe(a.key)
  })

  it('changes the key when rules or engine change but keeps the same cards hash', () => {
    const a = computeFingerprint(base)
    const r = computeFingerprint({ ...base, rules: 'v2.3' })
    const e = computeFingerprint({ ...base, engineVersion: '0.2.0' })
    expect(r.cards).toBe(a.cards)
    expect(e.cards).toBe(a.cards)
    expect(r.key).not.toBe(a.key)
    expect(e.key).not.toBe(a.key)
  })
})

describe('currentFingerprint (reads the real repo)', () => {
  it('fingerprints against the checked-out engine + card catalog', () => {
    const sources = repoFingerprintSources()
    expect(sources.engineVersion).toMatch(/^\d+\.\d+\.\d+/)
    expect(sources.catalog.length).toBeGreaterThan(1000)
    const fp = currentFingerprint('v3.0')
    expect(fp.rules).toBe('v3.0')
    expect(fp.engine).toBe(sources.engineVersion)
    expect(fp.cards).toMatch(/^[0-9a-f]{12}$/)
  })
})
