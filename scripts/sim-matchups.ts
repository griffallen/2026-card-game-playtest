/**
 * Balance harness: pit prebuilt decks against each other with alternating seats.
 *   npx tsx scripts/sim-matchups.ts                     # every pairing + mirrors, N=300, heuristic
 *   npx tsx scripts/sim-matchups.ts 150 random          # N=150, random policy
 *   npx tsx scripts/sim-matchups.ts 300 heuristic crimson-assault radiant-order   # one pairing
 *
 * Deterministic: seeds 1000..1000+N-1, seat alternates by game index. NOTE (playtest 001,
 * finding 2 — proven twice): these numbers are bounded by the bot's quality. Re-run every
 * matchup after ANY change to ai.ts before quoting results.
 *
 * RULES (fixed 2026-07-19, #98): runs under V3_RULES — the blocker-pairing combat the demo and
 * every v3 card actually use. Before this, it passed NO rules and silently fell back to
 * simulateGame's DEFAULT_RULES (legacy 'intercept' combat), so every quoted matchup measured the
 * WRONG game — e.g. yellow-vs-purple read 65/35 under intercept but 43/57 under real V3.
 */
import { PREBUILT_DECKS, deckSlugs, simulateGame, V3_RULES, type PolicyName } from '@newgame/engine'

const N = Number(process.argv[2] ?? 300)
const policy = (process.argv[3] ?? 'heuristic') as PolicyName
const only = process.argv.slice(4)

const deck = (slug: string) => {
  const d = PREBUILT_DECKS.find(x => x.slug === slug)
  if (!d) { console.error(`no such prebuilt deck: ${slug} (have: ${PREBUILT_DECKS.map(x => x.slug).join(', ')})`); process.exit(1) }
  return deckSlugs(d)
}

function matchup(aSlug: string, bSlug: string) {
  const A = deck(aSlug), B = deck(bSlug)
  let aWins = 0, byInf = 0
  const lens: number[] = []
  for (let i = 0; i < N; i++) {
    const aSeat = i % 2
    const decks = aSeat === 0 ? [A, B] : [B, A]
    const r = simulateGame(1000 + i, decks[0], decks[1], { policyA: policy, policyB: policy, rules: V3_RULES })
    if (r.winner === aSeat) aWins++
    if (r.winReason === 'influence') byInf++
    lens.push(r.rounds)
  }
  lens.sort((x, y) => x - y)
  console.log(
    `${aSlug} vs ${bSlug}`.padEnd(42)
    + ` ${(100 * aWins / N).toFixed(1)}%`.padStart(7)
    + `  inf ${(100 * byInf / N).toFixed(1)}%`
    + `  med ${lens[Math.floor(N / 2)]}r  (p10 ${lens[Math.floor(N * 0.1)]} p90 ${lens[Math.floor(N * 0.9)]})`,
  )
}

console.log(`policy=${policy} N=${N} rules=V3 (blocker-pairing) (alternating seats, seeds 1000+)`)
if (only.length === 2) matchup(only[0], only[1])
else {
  const slugs = PREBUILT_DECKS.map(d => d.slug)
  for (let i = 0; i < slugs.length; i++)
    for (let j = i; j < slugs.length; j++) matchup(slugs[i], slugs[j])
}
