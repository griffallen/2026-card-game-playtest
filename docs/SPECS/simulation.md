# Simulation Spec

The GENESYS asks for a harness that "simulates a variety of games, ensures gameplay can be completed, win conditions are possible," and later measures balance. v0 ships **inside the engine test suite** — no infrastructure, runs on every `npm test`.

## What a headless run is
`simulateRandomGame(seed, deckA, deckB, rules)` → both seats pick uniformly-random legal actions (from `getLegalActions`) until a winner exists or safety bounds trip.

## Determinism requirements
Same `(seed, decks, rules)` ⇒ identical action sequence and result. The random *policy* draws from the same seeded RNG stream as the game — one seed reproduces everything, including the bug you're hunting.

## Safety bounds
`maxActions = 4000` per game (a random game that long is livelocked). Exceeding bounds or throwing = test failure with the seed printed for replay.

## v0 assertions (CI-enforced)
Across seeds 1..150 (Red-prebuilt vs Yellow-prebuilt, both orderings):
1. Every game terminates with a winner and no engine errors.
2. Both win conditions (`life`, `influence`) occur somewhere in the batch — i.e., every win condition is *reachable*.
3. No state invariant violations (cards conserved across zones; life within bounds; influence within thresholds; exhausted ⊆ in-play) — checked by a validator after every action in sim mode.

## v0 measurements (reported, not asserted)
Printed as a table after the batch: win rate per deck and per seat (initiative advantage), win-reason split, mean/median rounds, mean actions, influence range visited. **Interpretation caveat printed with it:** random policies ≠ human play — these numbers smoke-test reachability and stability, not balance. (Early signal to watch per DECISIONS ⚑14: Red's Overextend actions feed Yellow's influence win.)

## Where it grows later
The policy is a function `(state, legalActions, rng) → action`. A heuristic AI, a MCTS bot, or a scripted line all plug into the same slot — the harness, invariants, and reporting don't change. Monte-carlo balance sweeps = this harness × parameter grid over `RulesConfig`.
