# Current Hand-off

**Phase:** Design (v3.0 intake) + live designer watch. **Griff is active on GitHub** — a 4-minute
loop checks the repo; this file is the fresh context's whole briefing.

## THE WATCH (what the loop iteration does)

1. `gh issue list --state all --json number,comments,state` — compare comment counts against the
   ledger below. **If nothing changed: reply "no change" and stop (low token mode — one tool
   call, one line, no elaboration).**
2. If Griff (@griffallen) posted: read it, **reply on the thread** (sign as **⚜ The Chronicler**),
   and fold rulings through the loop: DECISIONS.md → the affected spec/cards/docs → tests →
   deploy (`./scripts/deploy-demo.sh`) when player-facing. Commit + push everything.
3. Comment-count ledger as of 2026-07-10 ~23:45 (issue:comments, x = closed):
   **9:7 · 8:4x · 7:1 · 6:3 · 5:1 · 4:0 · 3:1x · 2:2 · 1:5x — 0 open PRs.**
   Griff said he'll open a NEW issue (color identities ↔ play styles) — a new issue number
   appearing is activity even if all counts match.
   Any number above these = new activity (my own replies are included in these counts).

## State (2026-07-10 midday)

- **Canon-v1.0 / rules v2.3 live everywhere** (demo deployed + verified; server seeds refresh).
  120 cards (36 purple = proposal), 122 tests green, all four verify scripts pass.
- **THE v3.0 GATE IS CLOSED — all ten questions answered.** Griff answered Q1–Q6 midday and
  Q7–Q10 in the evening (issue #9), all folded into `docs/SPECS/game-rules-v3-draft.md`,
  decisions 59–62 cut: MTG-style pips; target-declared blocker-pairing combat (defender pairs
  AND splits gang damage; unblocked damage → declared target; Breakthrough spills to target);
  Hidden CAN block; Sneak = per-card exhaust payloads; captives return exhausted; **Guard v3 =
  "does not exhaust to defend."** One derived default echoed on #9 for veto: **blocking exhausts
  non-Guard blockers** (Guard's perk is vacuous otherwise). Griff also closed #3 (prison) himself.
  **NEXT ARC (session-scale, needs Blaine or a fresh session — not a watch tick): finalize the
  draft as game-rules v3.0 → build plan (pips → keywords → combat) → card re-churn → canon-v2.0.**
- **Pip proposals delivered** (`docs/DESIGN/06-PIP-PROPOSAL.md`, Q3 task): cost-tiered grammar +
  13 deviations; awaiting Griff's slash-pass.
- **London mulligan shipped** (decision 58): `mulliganStyle` param + demo toggle, deployed.
  Griff's play verdict picks the default.
- Decisions 57–58 logged (naming stays; mulligan ruling). #8 closed. Audit tab = "The State of
  the Game" (current-only); original frozen at `/audit/archive`.
- **#6 answered (decision 63):** matchup-dependent influence is by design; blue + purple get
  pushed toward influence gameplay via the color-identity thread Griff is about to open (purple's
  influence posture feeds the v3 card re-churn; blue is a blank slate). #6 stays open until that
  thread lands. Issues still open for Griff: #4 (ratify redesigns), #5 (purple verdict),
  #7 (initiative feel), #9 (pip proposals slash-pass + blocking-exhausts veto window).

## Working agreements (from Blaine, this session)

- **Low token mode on idle loop iterations** — one line, no narration.
- Agent signs GitHub as **⚜ The Chronicler**; Blaine signs `-BB`.
- Deploy freely; issues are the designer channel; fold accepted rulings without re-asking.
- Port 3000 belongs to another project — server smoke-tests use `PORT=3100`; kill by listener PID.

## Reading order for a fresh session

This file → `docs/SPECS/game-rules-v3-draft.md` (the Q-holes) → issue #9 thread →
`docs/DESIGN/05-V3-DIRECTION.md` · `06-PIP-PROPOSAL.md` → DECISIONS.md 46–58 →
`docs/PLAYTESTS/001.md` (balance truth + the bot-quality moral). Session stories: summaries
006 (+postscript) and 007.
