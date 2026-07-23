import { describe, expect, it } from 'vitest'
import { CARD_SET } from '@newgame/engine'
import type { Op, Static } from '@newgame/engine'
import { KEYWORDS, glossFor, iconFor, shortGlossFor } from '@ui/game/gloss.ts'

/** Issue #114: the keyword gloss is the one place a keyword is explained AND given its symbol.
 *  These tests are the guard rail for two failure modes the project has actually hit:
 *  a card carrying a keyword no surface explains, and a gloss left behind for a keyword the
 *  game no longer has (reach, flying, overextend, untargetable, imprisoned). */

function liveKeywords(): string[] {
  const found = new Set<string>()
  const visitOps = (ops: Op[]) => {
    for (const op of ops) {
      if (op.op === 'grant') found.add(op.kw.k)
      if (op.op === 'grantTrigger') visitOps(op.ops)
      if (op.op === 'createCopies') for (const kw of op.kw ?? []) found.add(kw.k)
    }
  }
  for (const def of Object.values(CARD_SET)) {
    for (const kw of def.kw ?? []) found.add(kw.k)
    for (const stat of (def.statics ?? []) as Static[]) if (stat.s === 'aura' && stat.kw) found.add(stat.kw.k)
    for (const ops of [def.onPlay, def.onEnterZone, def.onAttack, def.onAttackBase, def.onDefend, def.onKill, def.onDeath, def.onHostDeath]) {
      if (ops) visitOps(ops)
    }
  }
  return [...found].sort()
}

const keywordsOnCards = liveKeywords()

describe('the keyword gloss covers exactly the live keyword set', () => {
  it('explains and illustrates every keyword printed on a card', () => {
    for (const k of keywordsOnCards) {
      expect(KEYWORDS[k], `no gloss entry for "${k}"`).toBeDefined()
      expect(iconFor(k), `no symbol for "${k}"`).not.toBe('')
      expect(shortGlossFor(k), `no short gloss for "${k}"`).not.toBe('')
      expect(glossFor(k), `no full gloss for "${k}"`).not.toBe('')
    }
  })

  it('carries no entry for a keyword no card has (dead keywords teach a game we do not run)', () => {
    expect(Object.keys(KEYWORDS).sort()).toEqual(keywordsOnCards)
  })

  it('has no gloss for the cut keywords by name', () => {
    for (const dead of ['reach', 'flying', 'overextend', 'untargetable', 'imprisoned']) {
      expect(KEYWORDS[dead], `"${dead}" was cut but still has a gloss`).toBeUndefined()
    }
  })

  it('reads the keyword name out of an engine keyword string like "armor 2"', () => {
    expect(iconFor('armor 2')).toBe(KEYWORDS.armor.icon)
    expect(glossFor('ranged 3')).toBe(KEYWORDS.ranged.gloss)
    expect(iconFor('nonsense')).toBe('')
  })

  it("keeps Griff's locked symbols exactly (issue #114 — he picked these)", () => {
    expect({
      shielded: iconFor('shielded'), guard: iconFor('guard'), rush: iconFor('rush'),
      breakthrough: iconFor('breakthrough'), tribune: iconFor('tribune'),
      armor: iconFor('armor'), ranged: iconFor('ranged'), sneak: iconFor('sneak'),
      infiltrate: iconFor('infiltrate'),
    }).toEqual({
      shielded: '🛡️', guard: '🏰', rush: '💨', breakthrough: '💪', tribune: '⚖️',
      armor: '🪖', ranged: '🏹', sneak: '🥷', infiltrate: '🗝️',
    })
  })

  it('gives every keyword a symbol of its own — a shared glyph tells you nothing', () => {
    const icons = Object.values(KEYWORDS).map(k => k.icon)
    expect(new Set(icons).size).toBe(icons.length)
  })
})
