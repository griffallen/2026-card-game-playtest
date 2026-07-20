import { describe, expect, it } from 'vitest'
import { simulateGame } from '../src/simulate.ts'
import { V3_RULES } from '../src/rules.ts'
import { applyAction } from '../src/engine.ts'
import { heuristicPolicy, policyRngInit } from '../src/ai.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import type { Seat } from '../src/types.ts'
import { game, put, toLoop } from './util.ts'

const red = deckSlugs(PREBUILT_DECKS[0])
const yellow = deckSlugs(PREBUILT_DECKS[1])

/* Run the game we actually play. Until 2026-07-19 (#98, decision 107) these calls passed no
   rules and silently got DEFAULT_RULES — the legacy v2.3 'intercept' combat — so both the AI
   quality bar and the balance picture below described a game nobody plays. */
const RULES = V3_RULES

describe('baseline heuristic AI', () => {
  it('beats random play convincingly and never crashes (60 games)', { timeout: 180_000 }, () => {
    let aiWins = 0
    for (let seed = 1; seed <= 30; seed++) {
      // heuristic plays red as seat 0, then yellow as seat 1 — both colors covered
      const asRed = simulateGame(seed, red, yellow, { rules: RULES, policyA: 'heuristic', policyB: 'random' })
      if (asRed.winner === 0) aiWins++
      const asYellow = simulateGame(seed + 500, red, yellow, { rules: RULES, policyA: 'random', policyB: 'heuristic' })
      if (asYellow.winner === 1) aiWins++
    }
    // deterministic given fixed seeds; floor set below the observed rate to allow tuning drift
    expect(aiWins / 60).toBeGreaterThan(0.6)
    console.log(`heuristic vs random: ${aiWins}/60 (${Math.round((aiWins / 60) * 100)}%)`)
  })

  it('heuristic mirror: 60 games terminate; report the competent-play balance picture', { timeout: 240_000 }, () => {
    const rows: { winner: number; winReason: string; rounds: number; firstDeck: string }[] = []
    for (let seed = 1; seed <= 30; seed++) {
      rows.push({ ...simulateGame(seed, red, yellow, { rules: RULES, policyA: 'heuristic', policyB: 'heuristic' }), firstDeck: 'red' })
      rows.push({ ...simulateGame(seed + 900, yellow, red, { rules: RULES, policyA: 'heuristic', policyB: 'heuristic' }), firstDeck: 'yellow' })
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

describe('AI under v2 rules (decisions 40–42)', () => {
  it('heuristic answers an intercept window without throwing, and saves a valuable target', () => {
    let s = toLoop(game())
    const a = s.actorSeat, b = (1 - a) as Seat
    const atk = put(s, a, 'brute', 1, { enteredRound: 0 })      // p4
    const jewel = put(s, b, 'soldier', 1, { enteredRound: 0 })  // the declared target (dies to 4)
    put(s, b, 'guardian', 1, { enteredRound: 0 })               // free interceptor
    s = applyAction(s, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: jewel } }, a).state
    expect(s.phase).toBe('intercept')
    const [action] = heuristicPolicy(s, b, policyRngInit(1))
    expect(action.type).toBe('intercept') // saving the soldier by throwing the free guard scores higher than letting it through
  })

  it('heuristic scores multi-unit attacks (prefers the lethal group over a chip single)', () => {
    let s = toLoop(game())
    const a = s.actorSeat
    s.sides[a].hand = [] // isolate the attack decision — no card plays competing
    put(s, a, 'soldier', 1, { enteredRound: 0 })
    put(s, a, 'soldier', 1, { enteredRound: 0 })
    put(s, (1 - a) as Seat, 'brute', 1, { enteredRound: 0 }) // h3: dies only to the 4-power group
    const [action] = heuristicPolicy(s, a, policyRngInit(1))
    expect(action.type).toBe('attack')
    if (action.type === 'attack') expect(action.attackers.length).toBe(2)
  })

  it('random policy completes games under the new rules (smoke)', () => {
    const r = simulateGame(77, deckSlugs(PREBUILT_DECKS[0]), deckSlugs(PREBUILT_DECKS[1]), { rules: RULES, policyA: 'random', policyB: 'random' })
    expect(r.winner === 0 || r.winner === 1).toBe(true)
  })
})
