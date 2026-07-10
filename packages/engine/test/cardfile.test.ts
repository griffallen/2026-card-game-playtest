import { describe, it, expect } from 'vitest'
import { parseCardFile, serializeCardFile } from '../src/cards/cardfile.ts'
import type { CardDef } from '../src/types.ts'

const GOOD = `---
name: Cinder Initiate
type: unit
cost: 1
power: 1
health: 1
keywords: rush, overextend 1
status: draft
---
Rush. Overextend 1.

## Design notes

A gamble, not a given.
`

describe('parseCardFile', () => {
  it('parses a full card', () => {
    const { card, errors } = parseCardFile(GOOD, 'cinder-initiate', 'red')
    expect(errors).toEqual([])
    expect(card!.status).toBe('draft')
    expect(card!.def).toEqual({
      slug: 'cinder-initiate', name: 'Cinder Initiate', color: 'red', type: 'unit',
      cost: 1, power: 1, health: 1, text: 'Rush. Overextend 1.',
      kw: [{ k: 'rush' }, { k: 'overextend', n: 1 }],
      designerNote: 'A gamble, not a given.',
      artUrl: '/cards/cinder-initiate.jpg',
    })
  })

  it('spreads effects JSON into the def', () => {
    const src = `---\nname: Bolt\ntype: action\ncost: 2\nstatus: canon\neffects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"damage","t":"chosen0","n":2}]}\n---\nDeal 2 damage to target enemy unit.\n`
    const { card, errors } = parseCardFile(src, 'bolt', 'red')
    expect(errors).toEqual([])
    expect(card!.def.onPlay).toEqual([{ op: 'damage', t: 'chosen0', n: 2 }])
    expect(card!.def.targets).toEqual([{ t: 'unit', side: 'enemy' }])
  })

  it('ignores comment lines in frontmatter', () => {
    const src = `---\nname: Bolt\ntype: action\ncost: 2\nstatus: canon\n# a comment\neffects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"damage","t":"chosen0","n":2}]}\n---\nDeal 2 damage to target enemy unit.\n`
    expect(parseCardFile(src, 'bolt', 'red').errors).toEqual([])
  })

  it('moves influence ops when influenceTrigger differs', () => {
    const src = `---\nname: Guardian\ntype: unit\ncost: 2\npower: 1\nhealth: 3\ninfluenceTrigger: onDefend\nstatus: draft\neffects: {"onPlay":[{"op":"influence","n":1}]}\n---\nWhen this defends, gain 1 Influence.\n`
    const { card, errors } = parseCardFile(src, 'guardian', 'yellow')
    expect(errors).toEqual([])
    expect(card!.def.onPlay).toBeUndefined()
    expect(card!.def.onDefend).toEqual([{ op: 'influence', n: 1 }])
  })

  it.each([
    [`---\nname: X\ntipe: unit\n---\n`, /unknown field "tipe"/],
    [`---\nname: X\ntype: unit\ncost: 1\npower: 1\nhealth: 1\nstatus: locked\n---\n`, /status must be one of/],
    [`---\nname: X\ntype: unit\ncost: one\npower: 1\nhealth: 1\nstatus: draft\n---\n`, /cost/],
    [`---\nname: X\ntype: action\ncost: 1\nstatus: draft\neffects: {broken\n---\n`, /effects is not valid JSON/],
    [`---\nname: X\ntype: action\ncost: 1\nstatus: draft\n---\nText.\n\n## Lore\n\nNope.\n`, /unknown section "## Lore"/],
    [`---\nname: X\ntype: unit\ncost: 1\npower: 1\nhealth: 1\nstatus: draft\nkeywords: sneaky\n---\n`, /unknown keyword "sneaky"/],
  ])('rejects bad input with a readable error', (src, want) => {
    const { card, errors } = parseCardFile(src, 'x', 'red')
    expect(card).toBeUndefined()
    expect(errors.join('\n')).toMatch(want)
  })
})

describe('serializeCardFile', () => {
  const def: CardDef = {
    slug: 'bolt', name: 'Bolt', color: 'red', type: 'action', cost: 2,
    text: 'Deal 2 damage to target enemy unit.',
    targets: [{ t: 'unit', side: 'enemy' }],
    onPlay: [{ op: 'damage', t: 'chosen0', n: 2 }],
    artUrl: '/cards/bolt.jpg',
  }

  it('round-trips losslessly', () => {
    const { card, errors } = parseCardFile(serializeCardFile(def, 'canon'), 'bolt', 'red')
    expect(errors).toEqual([])
    expect(card!.def).toEqual(def)
    expect(card!.status).toBe('canon')
  })

  it('is stable (serialize∘parse∘serialize = serialize)', () => {
    const once = serializeCardFile(def, 'canon')
    const { card } = parseCardFile(once, 'bolt', 'red')
    expect(serializeCardFile(card!.def, 'canon')).toBe(once)
  })

  it('refuses card text that would corrupt the format', () => {
    expect(() => serializeCardFile({ ...def, text: 'ok\n## sneaky heading' }, 'draft')).toThrow()
  })
})
