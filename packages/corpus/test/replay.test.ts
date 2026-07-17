import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { simulateGame, V3_RULES, PREBUILT_DECKS, deckSlugs } from '@newgame/engine'
import { extractReplayBlocks, parseReplayBlock, verifyReplay } from '../src/replay.ts'
import { recordGame, asPaste } from './helpers.ts'

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8')

describe('extractReplayBlocks', () => {
  it('pulls the replay block out of a realistic GitHub paste', () => {
    const block = recordGame(7)
    const found = extractReplayBlocks(asPaste(block))
    expect(found).toHaveLength(1)
    expect(found[0].block.seed).toBe(7)
    expect(found[0].block.actions.length).toBe(block.actions.length)
  })

  it('parses the exact format a real Griff paste uses (seed + resolved decks + actions)', () => {
    const found = extractReplayBlocks(fixture('griff-stale-paste.txt'))
    expect(found).toHaveLength(1)
    expect(found[0].block.rules).toBe('v3.0')
    expect(found[0].block.seed).toBe(1397808147)
    expect(found[0].block.decks.A.cards).toContain('doombringer') // old cardset
    expect(found[0].block.actions[0].a.type).toBe('setupBank')
  })

  it('accepts a bare JSON file (whole-text) and an array of blocks', () => {
    const one = recordGame(1)
    const two = recordGame(2)
    const { winner: _w1, rounds: _r1, ...b1 } = one
    const { winner: _w2, rounds: _r2, ...b2 } = two
    expect(extractReplayBlocks(JSON.stringify(b1))).toHaveLength(1)
    expect(extractReplayBlocks(JSON.stringify([b1, b2]))).toHaveLength(2)
  })

  it('returns nothing for junk with no replay block', () => {
    expect(extractReplayBlocks('just some chat, no game here')).toHaveLength(0)
    expect(extractReplayBlocks('```json\n{"not":"a replay"}\n```')).toHaveLength(0)
    expect(extractReplayBlocks('```\nnot even json\n```')).toHaveLength(0)
  })
})

describe('parseReplayBlock', () => {
  it('rejects malformed blocks with a clear error', () => {
    expect(() => parseReplayBlock({})).toThrow()
    expect(() => parseReplayBlock({ seed: 'x', decks: {}, actions: [] })).toThrow()
    expect(() => parseReplayBlock({ seed: 1, decks: { A: {}, B: {} }, actions: [] })).toThrow()
  })

  it('defaults a missing mulligan flag to false', () => {
    const b = recordGame(3)
    const { mulligan: _m, winner: _w, rounds: _r, ...rest } = b
    expect(parseReplayBlock(rest).mulligan).toBe(false)
  })
})

describe('verifyReplay', () => {
  it('replays a recorded game byte-clean and reports the true winner', () => {
    const seed = 42
    const block = recordGame(seed)
    const sim = simulateGame(seed, deckSlugs(PREBUILT_DECKS[0]), deckSlugs(PREBUILT_DECKS[1]), {
      rules: V3_RULES, policyA: 'heuristic', policyB: 'heuristic',
    })
    const res = verifyReplay(block)
    expect(res.ok).toBe(true)
    expect(res.terminal).toBe(true)
    expect(res.winner).toBe(sim.winner)
    expect(res.rounds).toBe(sim.rounds)
    expect(res.actionsApplied).toBe(res.totalActions)
    expect(res.winnerName).toBe(res.winner === 0 ? block.decks.A.name : block.decks.B.name)
  })

  it('rejects a stale-cardset log (a card the current set no longer has)', () => {
    const [{ block }] = extractReplayBlocks(fixture('griff-stale-paste.txt'))
    const res = verifyReplay(block)
    expect(res.ok).toBe(false)
    expect(res.errorStage).toBe('setup')
    expect(res.error).toMatch(/doombringer/)
  })

  it('rejects a corrupted action stream (a tampered move mid-game)', () => {
    const block = recordGame(7)
    // Corrupt an action deep in the game to an illegal one — replay must break.
    const tampered = structuredClone(block)
    const i = Math.floor(tampered.actions.length / 2)
    tampered.actions[i] = { s: tampered.actions[i].s, a: { type: 'play', card: 'c9999' } }
    const res = verifyReplay(tampered)
    expect(res.ok).toBe(false)
    expect(res.errorStage).toBe('action')
    expect(res.actionsApplied).toBeLessThan(res.totalActions)
  })

  it('flags a truncated (non-terminal) game as ok-but-not-terminal', () => {
    const block = recordGame(42)
    const truncated = { ...block, actions: block.actions.slice(0, 10) }
    const res = verifyReplay(truncated)
    expect(res.ok).toBe(true)
    expect(res.terminal).toBe(false)
    expect(res.winner).toBeNull()
  })
})
