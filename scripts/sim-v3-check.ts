// One-off: the churned 120 under full v3 rules — do real games complete, and how do they look?
import { simulateGame } from '../packages/engine/src/simulate.ts'
import { V3_RULES } from '../packages/engine/src/rules.ts'
import { PREBUILT_DECKS, deckSlugs } from '../packages/engine/src/decks.ts'
const POLICY = (process.argv[2] ?? 'random') as 'random' | 'heuristic'

const [a, b] = [deckSlugs(PREBUILT_DECKS[0]), deckSlugs(PREBUILT_DECKS[1])]
let wins = [0, 0], byInf = 0, rounds = 0, fails = 0
const N = 60
for (let seed = 1; seed <= N; seed++) {
  try {
    const r = simulateGame(seed, a, b, { rules: V3_RULES, policyA: POLICY, policyB: POLICY })
    wins[r.winner!]++; rounds += r.rounds
    if (r.winReason === 'influence') byInf++
  } catch (e) { fails++; if (fails <= 3) console.log(`seed ${seed}: ${(e as Error).message}`) }
}
console.log(`v3 real-card sim: ${N - fails}/${N} clean · ${PREBUILT_DECKS[0].name} ${wins[0]} — ${wins[1]} ${PREBUILT_DECKS[1].name} · influence wins ${byInf} · median-ish rounds ${(rounds / (N - fails)).toFixed(1)}`)
