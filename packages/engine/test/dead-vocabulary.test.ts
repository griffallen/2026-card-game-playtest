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
 */
import { describe, expect, it } from 'vitest'
import { validateCardSet } from '../src/validate.ts'
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
    for (const live of ['guard', 'rush', 'breakthrough', 'scar', 'hidden', 'infiltrate', 'capture', 'sneak', 'politician', 'shielded', 'cantAttack']) {
      const errors = validateCardSet({ 'test-unit': unit({ kw: [{ k: live as never }] }) })
      expect(errors, `${live} should be authorable`).toEqual([])
    }
  })
})

describe('the prison package is unauthorable', () => {
  it('rejects a card using the imprison op', () => {
    const errors = validateCardSet({
      'test-unit': unit({ targets: [{ t: 'unit', side: 'enemy' }], onPlay: [{ op: 'imprison', t: 'chosen0' }] } as never),
    })
    expect(errors.join(' ')).toMatch(/unknown op/i)
  })
})
