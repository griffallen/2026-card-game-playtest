import {
  CARD_SET, V3_RULES, DEFAULT_RULES, createGame, applyAction,
  type CardSet, type GameState, type RulesConfig,
} from '@newgame/engine'
import type { ReplayBlock, ReplayStep, VerifyResult } from './types.ts'

/** Loose shape guard — is this parsed value plausibly a replay block? */
function looksLikeReplay(o: unknown): o is Record<string, unknown> {
  if (!o || typeof o !== 'object') return false
  const r = o as Record<string, unknown>
  return typeof r.seed === 'number' && !!r.decks && typeof r.decks === 'object' && Array.isArray(r.actions)
}

/**
 * Validate + normalize a parsed value into a ReplayBlock. Throws a TypeError describing the
 * first thing wrong, so a junk paste is rejected loudly rather than silently mis-stored.
 */
export function parseReplayBlock(value: unknown): ReplayBlock {
  if (!value || typeof value !== 'object') throw new TypeError('replay block is not an object')
  const r = value as Record<string, unknown>
  if (typeof r.seed !== 'number') throw new TypeError('replay block: "seed" must be a number')
  if (typeof r.rules !== 'string') throw new TypeError('replay block: "rules" must be a string')
  const decks = r.decks as Record<string, unknown> | undefined
  if (!decks || typeof decks !== 'object') throw new TypeError('replay block: "decks" is missing')
  const deck = (side: 'A' | 'B') => {
    const d = decks[side] as Record<string, unknown> | undefined
    if (!d || typeof d !== 'object') throw new TypeError(`replay block: decks.${side} is missing`)
    if (!Array.isArray(d.cards) || !d.cards.every(c => typeof c === 'string')) {
      throw new TypeError(`replay block: decks.${side}.cards must be a string[]`)
    }
    return { name: typeof d.name === 'string' ? d.name : side, slug: typeof d.slug === 'string' ? d.slug : '', cards: d.cards as string[] }
  }
  if (!Array.isArray(r.actions)) throw new TypeError('replay block: "actions" must be an array')
  for (const [i, step] of (r.actions as unknown[]).entries()) {
    const s = step as Record<string, unknown>
    if (!s || (s.s !== 0 && s.s !== 1) || !s.a || typeof s.a !== 'object' || typeof (s.a as Record<string, unknown>).type !== 'string') {
      throw new TypeError(`replay block: actions[${i}] must be { s: 0|1, a: { type, ... } }`)
    }
  }
  return {
    seed: r.seed,
    rules: r.rules,
    mulligan: r.mulligan === true,
    decks: { A: deck('A'), B: deck('B') },
    policies: r.policies as ReplayBlock['policies'],
    actions: r.actions as ReplayStep[],
  }
}

/** Try each fenced code block; JSON-parse; keep the replay-shaped ones. */
function fromFences(text: string): unknown[] {
  const out: unknown[] = []
  for (const m of text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)) {
    try {
      const parsed = JSON.parse(m[1].trim())
      if (looksLikeReplay(parsed)) out.push(parsed)
    } catch { /* not JSON — skip */ }
  }
  return out
}

/**
 * Find every replay block in a blob of text — a pasted GitHub chronicle, a bare .json file,
 * or a JSON array of blocks. Non-replay fences (the ⚜ banner, a stray snippet) are ignored.
 */
export function extractReplayBlocks(text: string): { block: ReplayBlock; raw: unknown }[] {
  const candidates: unknown[] = []
  const trimmed = text.trim()
  // Whole-text JSON: a single block, or an array of blocks.
  try {
    const whole = JSON.parse(trimmed)
    if (Array.isArray(whole)) candidates.push(...whole.filter(looksLikeReplay))
    else if (looksLikeReplay(whole)) candidates.push(whole)
  } catch {
    // Not a bare JSON doc — scan fenced blocks inside the prose.
  }
  if (!candidates.length) candidates.push(...fromFences(text))

  const blocks: { block: ReplayBlock; raw: unknown }[] = []
  for (const raw of candidates) {
    try { blocks.push({ block: parseReplayBlock(raw), raw }) } catch { /* shaped-but-invalid — skip */ }
  }
  return blocks
}

/** The engine rules the block was played under — mirrors the demo's own mapping exactly. */
export function rulesForBlock(block: ReplayBlock): RulesConfig {
  const base = block.rules === 'v3.0' ? V3_RULES : DEFAULT_RULES
  return block.mulligan ? { ...base, mulliganStyle: 'london' } : base
}

/**
 * Replay a block byte-for-byte through the engine off its seed. This is the collector's gate:
 * a log that doesn't reproduce (an illegal action, or a card the current set no longer has)
 * is rejected. `ok` = every recorded action applied legally; `terminal` = it reached a winner.
 */
export function verifyReplay(block: ReplayBlock, opts: { cardSet?: CardSet } = {}): VerifyResult {
  const cardSet = opts.cardSet ?? CARD_SET
  const totalActions = block.actions.length
  const fail = (stage: 'setup' | 'action', applied: number, e: unknown): VerifyResult => {
    const err = e as { code?: string; message?: string }
    return {
      ok: false, terminal: false, winner: null, winnerName: null, winReason: null, rounds: 0,
      actionsApplied: applied, totalActions,
      error: err.message ?? String(e), errorCode: err.code, errorStage: stage,
    }
  }

  let state: GameState
  try {
    state = createGame({
      seed: block.seed,
      rules: rulesForBlock(block),
      cardSet,
      players: [
        { name: block.decks.A.name, deck: block.decks.A.cards },
        { name: block.decks.B.name, deck: block.decks.B.cards },
      ],
    })
  } catch (e) {
    return fail('setup', 0, e)
  }

  let applied = 0
  for (const step of block.actions) {
    try {
      state = applyAction(state, step.a, step.s).state
      applied++
    } catch (e) {
      return fail('action', applied, e)
    }
  }

  const winner = state.winner
  return {
    ok: true,
    terminal: winner !== null,
    winner,
    winnerName: winner === null ? null : state.sides[winner].name,
    winReason: state.winReason,
    rounds: state.round,
    actionsApplied: applied,
    totalActions,
  }
}
