# Playbook: Build Plan

Slice the specs into ordered, vertical increments in `docs/DESIGN/03-BUILD-PLAN.md`. Each slice is a working end-to-end increment — schema + logic + routes + views + tests — that leaves the project demonstrably better and unblocks the slices after it.

## For each slice, record

- What it covers (which spec sections)
- What it depends on
- What tests prove it works
- What "done" looks like — something the user can see or run

## Slicing advice for this project

- **The engine wants to come first.** A pure, deterministic engine package (mechanics + parameters + seeded RNG, per the tech stack doc) unblocks the sim harness, the play UI, and most testing — and it's the most testable code in the project. A good slice 1: engine core playing a stripped-down subset of the rules, exercised entirely through tests.
- Admin CRUD (cards, parameters) and the deck builder depend on the schema, not on each other or the play UI — they can interleave.
- Keep the play modes in GENESYS order: local two-player first, then network play, then the AI player.

## Transition gate → implementation

1. Is each slice truly end-to-end and buildable without later slices?
2. Could a developer with no context build from this plan plus the specs?
3. **Tooling check — last stop before code.** Node.js LTS installed, database available (per the tech stack doc), editor ready. Walk through installs if needed; don't assume familiarity.
