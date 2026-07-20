/**
 * Cut mechanics must be unauthorable.
 *
 * The rules said Reach, Flying, Overextend, Untargetable and the whole prison package were gone
 * (issues #3, #8, #9; decisions 70->94 replaced Overextend with Scar, Hidden superseded
 * Untargetable). The ENGINE never got the memo: the keyword union still declared them, the card
 * validator still accepted them, and `flying` still let a unit move to any zone. No card used
 * them, so nothing was broken — but a card authored with `keywords: flying` would have validated,
 * shipped, and quietly contradicted the rulebook.
 *
 * These tests are the fence: the vocabulary a card may use is the vocabulary the rules teach.
 *
 * #134 finished the job for prison: the op, the imprisonWatcher static, UnitInstance.imprisoned,
 * the decay/release logic and the two rules-config knobs are deleted, not merely unauthorable.
 */
import { describe, expect, it } from 'vitest'
import { validateCardSet } from '../src/validate.ts'
import { DEFAULT_RULES } from '../src/rules.ts'
import type { CardDef } from '../src/types.ts'

const unit = (extra: Partial<CardDef>): CardDef => ({
  slug: 'test-unit', name: 'Test Unit', color: 'red', type: 'unit',
  cost: 2, power: 2, health: 2, text: 'test', kw: [], ...extra,
} as CardDef)

describe('cut keywords are unauthorable', () => {
  for (const dead of ['reach', 'flying', 'overextend', 'untargetable']) {
    it(`rejects a card carrying "${dead}"`, () => {
      const errors = validateCardSet({ 'test-unit': unit({ kw: [{ k: dead as never }] }) })
      expect(errors.join(' ')).toMatch(/keyword/i)
    })
  }

  it('still accepts the live keywords', () => {
    for (const live of ['guard', 'rush', 'breakthrough', 'scar', 'hidden', 'infiltrate', 'capture', 'sneak', 'tribune', 'shielded', 'cantAttack']) {
      const errors = validateCardSet({ 'test-unit': unit({ kw: [{ k: live as never }] }) })
      expect(errors, `${live} should be authorable`).toEqual([])
    }
  })
})

describe('the prison package is gone', () => {
  it('rejects a card using the imprison op', () => {
    const errors = validateCardSet({
      'test-unit': unit({ targets: [{ t: 'unit', side: 'enemy' }], onPlay: [{ op: 'imprison', t: 'chosen0' }] } as never),
    })
    expect(errors.join(' ')).toMatch(/unknown op/i)
  })

  it('rejects a card carrying the imprisonWatcher static', () => {
    const errors = validateCardSet({ 'test-unit': unit({ statics: [{ s: 'imprisonWatcher', n: 1 }] } as never) })
    expect(errors.join(' ')).toMatch(/unknown static/i)
  })

  // #134: the prison tuning knobs left with the mechanic. A key still sitting in RulesConfig is a
  // rule the admin panel can dial that nothing enforces — the exact shape of a hidden mechanic.
  it('has no prison keys left in the rules config', () => {
    for (const dead of ['prisonDecayPerUnit', 'prisonReleaseThreshold']) {
      expect(Object.keys(DEFAULT_RULES), `${dead} should be gone from RulesConfig`).not.toContain(dead)
    }
  })
})
