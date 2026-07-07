import { describe, expect, it } from 'vitest'
import { simulateRandomGame } from '../src/simulate.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import type { SimResult } from '../src/types.ts'

const red = deckSlugs(PREBUILT_DECKS[0])
const yellow = deckSlugs(PREBUILT_DECKS[1])
const SEEDS = 75 // × 2 orderings = 150 games

describe('random-playout simulation (GENESYS harness v0)', () => {
  it('150 seeded games all terminate with a winner, no crashes, both win conditions reachable', { timeout: 180_000 }, () => {
    const results: (SimResult & { firstDeck: string })[] = []
    for (let seed = 1; seed <= SEEDS; seed++) {
      results.push({ ...simulateRandomGame(seed, red, yellow), firstDeck: 'red' })
      results.push({ ...simulateRandomGame(seed + 10_000, yellow, red), firstDeck: 'yellow' })
    }

    expect(results.length).toBe(SEEDS * 2)
    for (const r of results) expect(r.winner === 0 || r.winner === 1).toBe(true)

    const byReason = new Map<string, number>()
    for (const r of results) byReason.set(r.winReason, (byReason.get(r.winReason) ?? 0) + 1)
    // reachability: both core win conditions occur somewhere in the batch
    expect(byReason.get('life') ?? 0).toBeGreaterThan(0)
    expect(byReason.get('influence') ?? 0).toBeGreaterThan(0)

    // ── report (numbers are smoke-test signal, NOT balance — random ≠ human play) ──
    const pct = (n: number) => `${n}/${results.length} (${Math.round((n / results.length) * 100)}%)`
    const redWins = results.filter(r => (r.firstDeck === 'red' ? r.winner === 0 : r.winner === 1)).length
    const seat0Wins = results.filter(r => r.winner === 0).length
    const turns = results.map(r => r.turns).sort((a, b) => a - b)
    const lines = [
      `games: ${results.length}`,
      `win reasons: ${[...byReason.entries()].map(([k, v]) => `${k} ${v}`).join(', ')}`,
      `red deck wins: ${pct(redWins)}`,
      `first player (seat 0) wins: ${pct(seat0Wins)}`,
      `turns: median ${turns[Math.floor(turns.length / 2)]}, min ${turns[0]}, max ${turns[turns.length - 1]}`,
      `mean actions/game: ${Math.round(results.reduce((s, r) => s + r.actions, 0) / results.length)}`,
    ]
    console.log(`\n── sim report ──\n${lines.join('\n')}\n(random-policy caveat: reachability + stability signal only)\n`)
  })
})
