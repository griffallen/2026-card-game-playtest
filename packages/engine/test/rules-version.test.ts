import { describe, it, expect } from 'vitest'
import { DEFAULT_RULES, V3_RULES, normalizeRules } from '../src/rules.ts'

// Slice V3-1 (build plan): one engine, two rule sets. v2.3 defaults preserve today's
// behavior exactly; the V3_RULES preset flips the structural switches (spec: game-rules-v3-draft).
describe('rules versioning (v3 plumbing)', () => {
  it('v2.3 defaults keep legacy behavior: intercept combat, no pips, upgrades die with wearer', () => {
    expect(DEFAULT_RULES.combatModel).toBe('intercept')
    expect(DEFAULT_RULES.pipModel).toBe('none')
    expect(DEFAULT_RULES.upgradesOrphan).toBe(false)
  })

  it('V3_RULES preset flips the v3 switches (decisions 62, 67, 69)', () => {
    expect(V3_RULES.combatModel).toBe('blockerPairing')
    expect(V3_RULES.pipModel).toBe('presence')
    expect(V3_RULES.upgradesOrphan).toBe(true)     // decision 67: orphan + salvage
    expect(V3_RULES.blockingExhausts).toBe(true)   // decision 62: Guard exempt in combat code
    // everything not deliberately flipped inherits the shared defaults
    expect(V3_RULES.startingLife).toBe(DEFAULT_RULES.startingLife)
    expect(V3_RULES.mulliganStyle).toBe(DEFAULT_RULES.mulliganStyle)
  })

  it('normalizeRules fills the new switches on stored legacy configs', () => {
    const legacy = normalizeRules({ startingLife: 25 })   // a pre-v3 stored config
    expect(legacy.combatModel).toBe('intercept')
    expect(legacy.pipModel).toBe('none')
    expect(legacy.startingLife).toBe(25)
  })
})
