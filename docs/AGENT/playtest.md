# Playbook: Playtest & Iterate

The prototype exists — now the real work: playing the game and changing it.

## Playtest sessions

- Help set up games (local two-player first). Capture observations as they come up: what dragged, what felt unfair, what was confusing, what was fun.
- Record findings in `docs/PLAYTESTS/NNN.md` — date, rules version, decks used, observations, and the changes they suggest.

## The iteration loop

Every meaningful change goes back through the loop in miniature:

1. **Design** — what problem are we solving, what are the options? Use `design.md` methods: one decision at a time, record it in `DECISIONS.md`.
2. **Spec** — update `docs/SPECS/game-rules.md`. A parameter change means new values under a new rules version. A mechanics or vocabulary change means spec first, then engine work.
3. **Implement** — engine changes follow `implement.md` discipline. Parameter-only changes should need no code at all — when that happens, the design is working.
4. Bump the rules version and keep old versions playable, so changes can be compared head-to-head.

## Simulation-assisted balance

Once the sim harness exists, use it around every change: run N seeded games between reference decks and compare win rates, game lengths, and influence swings before and after. A big swing deserves a conversation before the change ships.

## Deployment

When it's time to play together online, guide the deploy to the GENESYS target (cheap VPS or app service): Postgres, Node, reverse proxy, env vars, backups. Keep it boring, and document what was done in `docs/OPERATIONS.md`.
