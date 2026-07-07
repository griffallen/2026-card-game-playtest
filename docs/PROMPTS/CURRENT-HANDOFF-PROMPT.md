# Current Hand-off

**Phase:** Playtest & iterate — the first full design→implement pass is done (session 001, 2026-07-07)
**Working with:** probably the designer — confirm at session start (Blaine deploys first)

## State

The prototype is real and playable: accounts, deck selection, two-human remote play over websockets, spectators, undo, card browser, and an admin hall that tunes cards, decks, and rule parameters without code. Local: `npm run dev` (see README-DEPLOY.md for Postgres setup). Deploy: `README-DEPLOY.md` (fly.io + Neon; the Docker image migrates and seeds itself on boot). 65 automated tests plus a 150-game random-playout simulation gate every change.

Rules v1.2 was reconciled with the July 5 card sheets into a complete playable ruleset — 30 recorded decisions, every one flagged ⚑ in `docs/DESIGN/DECISIONS.md` and on the affected cards in the card browser. The engine is pure and deterministic (seed + actions = same game, always), cards are structured data the engine validates on every admin edit, and games are event-sourced (replayable, undoable).

## Next

1. Read `CLAUDE.md`, then `docs/AGENT/playtest.md`.
2. If this is the designer's session: start from `docs/GAME-FLOW.md` — it's the game as it plays now, with every prototype ruling flagged and five open questions queued.
3. Play games. Log what feels wrong. Most fixes are a rules-parameter edit (admin → Rules) or a card-number edit (admin → Cards) — reserve engine changes for real mechanics shifts, and run those through a mini design → spec pass first (DECISIONS.md + docs/SPECS/game-rules.md).

## Open questions

- **Influence economy** — the one with data: under random play, influence wins 87%, red deck wins 1%. Candidate knobs in GAME-FLOW.md. Human playtests will say how real it is.
- Movement feel (exhaust-to-move), off-turn play freedom, Flying/Citadel/prison-threshold rulings, and whether the June spreadsheet's Stack/modal-cards ideas get adopted or archived — all queued in GAME-FLOW.md §Open questions.
