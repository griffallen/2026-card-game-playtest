/**
 * Every live card-word must be reachable by a real card.
 *
 * validate.ts publishes two vocabularies a card may use: KEYWORDS (the printable/grantable
 * keywords) and OPS (the effect verbs). This is the other half of dead-vocabulary's fence — that
 * one proves CUT words are unauthorable; this one proves every LIVE word is actually USED. A
 * keyword or op that no card carries is either an orphan to cull (CLAUDE.md's retired-mechanics
 * convention, #135) or a deliberate keep that must be named on the allowlist below with its reason.
 *
 * It reads the SAME compiled pool cards:check builds — CARD_SET / generated.json — never the .md
 * files. A prose mention in a design note is not a use: preventBase is named in the bodies of
 * obscure.md and midnight-reckoning.md but wired to no card's effects, so a .md grep would mask
 * that orphan. We walk compiled effects instead.
 */
import { describe, expect, it } from 'vitest'
import { CARD_SET } from '../src/cards/index.ts'
import { KEYWORDS, OPS } from '../src/validate.ts'
import type { CardDef, Op, Static, TargetSpec } from '../src/types.ts'

// Words the engine keeps though no card wires them today. Each needs a one-line reason citing the
// issue/decision — an empty note would let a real orphan slip through as "allowlisted".
const OP_ALLOWLIST: Record<string, string> = {
  // #122/#135: was Obscure's op until Griff's #122 rework swapped it for the pick-from-hand
  // discard (chooseFromHand). Kept for future use, deliberately NOT culled (issue #135).
  preventBase: 'Obscure retired it for chooseFromHand (#122); kept for future, not culled (#135)',
}
const KEYWORD_ALLOWLIST: Record<string, string> = {}

/**
 * The vocabulary actually reachable by a card: printed keywords, granted keywords (grant /
 * createCopies ops, auras, withKw filters), and every op across every effect list (triggers,
 * start/end-of-round, sneak, activated, and each mode).
 */
function usedVocabulary(cards: CardDef[]): { keywords: Set<string>; ops: Set<string> } {
  const keywords = new Set<string>()
  const ops = new Set<string>()
  const opLists = (d: CardDef): Op[][] =>
    [d.onPlay, d.onEnterZone, d.onAttack, d.onAttackBase, d.onDefend, d.onKill, d.onDeath,
     d.onHostDeath, d.startOfRound?.ops, d.endOfRound?.ops, d.sneak?.ops, d.activated?.ops,
     ...(d.modes ?? []).map(m => m.ops)].filter(Boolean) as Op[][]
  const targetLists = (d: CardDef): TargetSpec[][] =>
    [d.targets, d.sneak?.targets, d.activated?.targets,
     ...(d.modes ?? []).map(m => m.targets)].filter(Boolean) as TargetSpec[][]

  for (const d of cards) {
    for (const k of d.kw ?? []) keywords.add(k.k)
    for (const list of opLists(d)) for (const op of list) {
      ops.add(op.op)
      if (op.op === 'grant') keywords.add(op.kw.k)
      if (op.op === 'createCopies') for (const k of op.kw ?? []) keywords.add(k.k)
    }
    for (const st of (d.statics ?? []) as Static[]) if (st.s === 'aura' && st.kw) keywords.add(st.kw.k)
    for (const list of targetLists(d)) for (const t of list) if (t.withKw) keywords.add(t.withKw)
  }
  return { keywords, ops }
}

describe('every card-word is reachable', () => {
  const used = usedVocabulary(Object.values(CARD_SET))

  it('every keyword in KEYWORDS sits on a card (or is allowlisted with a reason)', () => {
    const orphans = [...KEYWORDS].filter(k => !used.keywords.has(k) && !(k in KEYWORD_ALLOWLIST))
    expect(orphans, `orphaned keywords — cull them or allowlist with a reason: ${orphans.join(', ')}`).toEqual([])
  })

  it('every op in OPS is used by a card (or is allowlisted with a reason)', () => {
    const orphans = [...OPS].filter(o => !used.ops.has(o) && !(o in OP_ALLOWLIST))
    expect(orphans, `orphaned ops — cull them or allowlist with a reason: ${orphans.join(', ')}`).toEqual([])
  })

  it('carries no stale allowlist entry (an allowlisted word a card now DOES use)', () => {
    const staleKw = Object.keys(KEYWORD_ALLOWLIST).filter(k => used.keywords.has(k))
    const staleOps = Object.keys(OP_ALLOWLIST).filter(o => used.ops.has(o))
    expect(staleKw, `keyword allowlist entries no longer needed: ${staleKw.join(', ')}`).toEqual([])
    expect(staleOps, `op allowlist entries no longer needed: ${staleOps.join(', ')}`).toEqual([])
  })

  it('allowlists only real vocabulary members (no typos)', () => {
    const badKw = Object.keys(KEYWORD_ALLOWLIST).filter(k => !KEYWORDS.has(k))
    const badOps = Object.keys(OP_ALLOWLIST).filter(o => !OPS.has(o))
    expect(badKw, `allowlisted keywords not in KEYWORDS: ${badKw.join(', ')}`).toEqual([])
    expect(badOps, `allowlisted ops not in OPS: ${badOps.join(', ')}`).toEqual([])
  })
})
