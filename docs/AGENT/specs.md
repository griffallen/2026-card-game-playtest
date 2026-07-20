# Playbook: Specs

Convert design decisions into implementable specs in `docs/SPECS/`. The bar: a developer could build from these with no other context, and the designer can still read them.

## The five specs

1. **`docs/rules.md`** — the rules, generated from `apps/demo/src/pages/Rules.tsx`. Three sections:
   - **Core mechanics** — turn structure, zones, action alternation, combat resolution, timing and trigger ordering, win-condition checks. These become engine code; changing them requires the builder.
   - **Parameters** — every tunable value, named, typed, with its current default: starting life, influence win threshold, starting hand size, draw count, deck minimum, max copies, … These become data the designer edits in the admin.
   - **Effect vocabulary** — every keyword and trigger pattern the engine implements (Guard, Armor X, Rush, Breakthrough, Overextend, Imprison, influence triggers, …), each with precise semantics and its parameters. Every card must be expressible in this vocabulary.
2. **`data-models.md`** — every entity: cards, decks, users, rules versions, games and game states. Fields, types, relationships, constraints, and what happens on deletion.
3. **`api-endpoints.md`** — every route: method, path, request/response shapes, validation rules. Plus the WebSocket message protocol for play.
4. **`views.md`** — every page (deck builder, card admin, parameter admin, play table, …): what it shows, what data it needs, what actions the user can take.
5. **`simulation.md`** — the sim harness: what a headless game run is, seeding and determinism requirements, what it verifies (games always terminate without errors; every win condition is reachable) and what it measures (win rates per deck and rules version, game length, influence swings).

Suggested order: game-rules first — everything else feeds off it. Then data-models, then api-endpoints + views, then simulation.

## Method

Don't write specs *for* the user — ask what they think an entity or rule needs, build on the answer, add what they missed and explain why. If they say "I don't know, just write it": draft it and ask them to critique — "Here's what I'd start with. What would you change?" The learning is in the review.

## Spec audit

After completing each spec, switch hats: read it as the developer who has to implement it tomorrow with no other context. What's ambiguous? What's missing? What would you have to guess? Finding a gap here is the process working — cheaper now than in code. Fix it and move on.

## Done when

All five specs are complete and audited. Then move to `build-plan.md`.
