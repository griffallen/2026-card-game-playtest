import { describe, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { viewFor } from '../src/view.ts'
import { POLICIES, policyRngInit } from '../src/ai.ts'
import { createGame } from '../src/setup.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import type { GameState, Seat } from '../src/types.ts'

// #90: demo black-screens (render throw, no ErrorBoundary) during a gang attack. The sim never
// calls viewFor, so a render-data bug hides from it. Fuzz: play full V3 heuristic games and call
// viewFor for BOTH seats after every single action — the demo renders that on every state.
describe('#90 viewFor fuzz across full V3 games', () => {
  it('viewFor never throws on any reachable V3 state', { timeout: 60000 }, () => {
    for (let seed = 0; seed < 12; seed++) {
      let s: GameState = createGame({
        seed, rules: { ...V3_RULES, chooseStartingResources: false }, cardSet: CARD_SET,
        players: [{ name: 'A', deck: deckSlugs(PREBUILT_DECKS.find(d => d.slug === 'radiant-order') ?? PREBUILT_DECKS[0]) },
                  { name: 'B', deck: deckSlugs(PREBUILT_DECKS.find(d => d.slug === 'crimson-assault') ?? PREBUILT_DECKS[1]) }],
      })
      let rng = policyRngInit(seed)
      let steps = 0
      viewFor(s, 0); viewFor(s, 1)
      while (s.winner === null && steps++ < 600) {
        const actor = s.actorSeat as Seat
        const [action, next] = POLICIES.heuristic(s, actor, rng)
        rng = next
        try {
          s = applyAction(s, action, actor).state
        } catch (e) {
          throw new Error(`ENGINE threw seed ${seed} step ${steps} action ${JSON.stringify(action)}: ${(e as Error).message}`)
        }
        try {
          viewFor(s, 0); viewFor(s, 1)
        } catch (e) {
          throw new Error(`viewFor threw seed ${seed} step ${steps} after ${JSON.stringify(action)} (phase ${s.phase}): ${(e as Error).message}\n${(e as Error).stack}`)
        }
      }
    }
  })
})
