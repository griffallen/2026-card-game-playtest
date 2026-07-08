import { describe, expect, it } from 'vitest'
import { simulateGame } from '../src/simulate.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'

const red = deckSlugs(PREBUILT_DECKS[0])
const yellow = deckSlugs(PREBUILT_DECKS[1])

describe('baseline heuristic AI', () => {
  it('beats random play convincingly and never crashes (60 games)', { timeout: 180_000 }, () => {
    let aiWins = 0
    for (let seed = 1; seed <= 30; seed++) {
      // heuristic plays red as seat 0, then yellow as seat 1 — both colors covered
      const asRed = simulateGame(seed, red, yellow, { policyA: 'heuristic', policyB: 'random' })
      if (asRed.winner === 0) aiWins++
      const asYellow = simulateGame(seed + 500, red, yellow, { policyA: 'random', policyB: 'heuristic' })
      if (asYellow.winner === 1) aiWins++
    }
    // deterministic given fixed seeds; floor set below the observed rate to allow tuning drift
    expect(aiWins / 60).toBeGreaterThan(0.6)
    console.log(`heuristic vs random: ${aiWins}/60 (${Math.round((aiWins / 60) * 100)}%)`)
  })

  it('heuristic mirror: 60 games terminate; report the competent-play balance picture', { timeout: 240_000 }, () => {
    const rows: { winner: number; winReason: string; rounds: number; firstDeck: string }[] = []
    for (let seed = 1; seed <= 30; seed++) {
      rows.push({ ...simulateGame(seed, red, yellow, { policyA: 'heuristic', policyB: 'heuristic' }), firstDeck: 'red' })
      rows.push({ ...simulateGame(seed + 900, yellow, red, { policyA: 'heuristic', policyB: 'heuristic' }), firstDeck: 'yellow' })
    }
    const redWins = rows.filter(r => (r.firstDeck === 'red' ? r.winner === 0 : r.winner === 1)).length
    const byReason = new Map<string, number>()
    for (const r of rows) byReason.set(r.winReason, (byReason.get(r.winReason) ?? 0) + 1)
    const turns = rows.map(r => r.rounds).sort((a, b) => a - b)
    console.log(`\n── heuristic-mirror report ──`)
    console.log(`red deck wins: ${redWins}/60 (${Math.round((redWins / 60) * 100)}%)`)
    console.log(`win reasons: ${[...byReason.entries()].map(([k, v]) => `${k} ${v}`).join(', ')}`)
    console.log(`turns: median ${turns[Math.floor(turns.length / 2)]}, min ${turns[0]}, max ${turns[turns.length - 1]}`)
    expect(rows.length).toBe(60)
    for (const r of rows) expect(r.winner === 0 || r.winner === 1).toBe(true)
  })
})
