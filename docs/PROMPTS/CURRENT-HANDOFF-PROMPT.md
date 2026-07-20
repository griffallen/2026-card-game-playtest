# Current hand-off (2026-07-20 — after the documentation + process reset, v0.7.0)

**Phase:** Playtest & iterate. The game is stable on red/yellow/purple — 120 cards canon, rules
version 3.2.0, 581 tests green, v0.7.0 deployed and live. **Next in the chair:** likely **Griff**
(three decisions waiting) or **Blaine**. Model routing per CLAUDE.md.

**Read first:** `docs/rules.md` — the complete current rules, always accurate. It is **generated**
from `apps/demo/src/pages/Rules.tsx`; run `npm run rules:doc` after any rules-prose change, and
`npm run rules:doc:check` gates it. Then **#129 (The Board)** for what is waiting on whom, and
**#136** for the full audit record of the 2026-07-19/20 reset.

**Waiting on Griff** — each has a default if he stays silent, stated on the issue:
1. **#127** — Politician: must a Politician stand in the zone to get paid? (A or B). Silent → stays "anywhere". Blocks the influence swing on #125.
2. **#125** — Tribune rename, and whether the influence swing sits on top of the round-end payout or replaces it. Settle #127 first.
3. **#128** — Breakthrough splash outside the enemy Home: does he want it at all? Silent → nothing changes.

**Waiting on Blaine:** nothing. **#136** is an audit record for him and Griff to read and close.

**Agent-owned, no human needed:** **#132** (`verify-block-drive.ts` broken — pre-existing, its
blocker fixture is no longer legal); **#133** (dead overextend-arming UI in the tables — inert but
stale). Backlogged: **#134** (full prison removal), **#135** (a retired-mechanics convention).
**#98** stays open by design — it is the corpus paste-bin, not a task.

**Standing rules worth knowing before acting:**
- **Card work is never `major`.** Stats, costs, statuses, new cards and balance are Griff's lane and never wait on Blaine. If a card needs an effect the engine lacks, `cards:check` fails with `unknown op` — *that* is the `major`.
- **No balance call may cite a sim figure from before 2026-07-20** (decision 107) — re-run it first.
- **Every GitHub comment opens with an action header**, one ask per comment (`.claude/skills/watch/SKILL.md`).
- The demo is the only surface anyone plays; deploy it yourself, never defer to a human.

**Open question nobody has answered yet:** the corrected sims say red is the problem colour and
yellow the genuine bottom (red 67% over yellow, corroborated by piloted games on #98). The balance
pass that follows from that has not been scoped.
