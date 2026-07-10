# Current Hand-off

**Phase:** Playtest & iterate — **canon-v1.0 is stamped and tagged** (session 006). The rules are
locked at v2.2, every red/yellow card is reconciled and `canon`, the per-card GitHub editing
workflow is live, and a purple third-deck proposal is waiting for the designer.

## State

- **The canon:** `docs/canon/CANON.md` (index) · game-rules **v2.2** · red + yellow **charters**
  (the middle layer — identity, invariants, statline grammar) · the **card ledger** at
  `data/cards/<color>/<slug>.md` — one file per card, the single source of truth (decision 46).
  `npm run cards` compiles+validates → `generated.json` + `INDEX.md`; `npm run cards:check` is the
  PR gate; a drift test fails if anyone forgets to rebuild.
- **Griff's workflow is live:** edit any card file on GitHub → PR (guide: `data/cards/README.md`);
  bigger ideas → plain-language issues. **Session start: `gh pr list` + `gh issue list`** — triage
  per CLAUDE.md. The agent reviews every card PR: valid? · text↔effects consistent? · in-charter?
- **Balance (playtest 001):** red ~45–55% vs yellow (even within bot noise), median 11–12 rounds,
  seat parity ✓. Two load-bearing findings: the sim bot is only now *target-aware* (older
  percentages were partly artifacts), and **prison was the dominator** — fixed by rules v2.2's
  decay 2/prisoner (decision 55 ⚑, prison itself still "on notice", decision 37).
- **Purple (proposal):** the **Veiled Court** — 36 cards, `status: draft`, charter at
  `docs/canon/decks/purple.md`, veil-motif SVG placeholder art, playable in the demo (third deck
  in every picker). Soft triangle: 47.5% vs red, 65% vs yellow. Adopt/revise/shelve = CANON.md
  question 7.
- **UX:** the double-click-plays trap is dead (second tap deselects; explicit buttons only);
  right-click/long-press inspects everything. Audit record in `docs/PLAYTESTS/001.md`.
- **Verified:** 117 tests green, typecheck clean, ledger current, server seeds 120 cards/3 decks
  against real Postgres (healthz ok), web production build ok. This machine now has a working
  local env (`apps/server/.env`, Homebrew Postgres 14 via `brew services run`).
- **Git:** everything on `main`, tagged `canon-v1.0`, pushed to origin.
- **Deployed:** blainebooher.com/new-game-demo now runs **canon-v1.0** (deployed + browser-verified
  this session: 120 cards, purple live, UX fixes in). Redeploy after any merge: `./scripts/deploy-demo.sh`.

## Do next

1. **Point Griff at it** (the demo is already live): the demo's Audit tab has his copy-paste question list (8 questions);
   `data/cards/README.md` teaches the PR workflow; every session-006 redesign is on its card's
   Design notes, ratify-or-veto.
2. **Play it by hand** — the sims say "even"; only humans can say "fun." Feel questions: claiming
   initiative, the intercept window, the v2.2 prison mortgage, and whether purple's triangle is a
   feature.
3. When Griff answers: fold rulings through the loop (DECISIONS.md → charters/cards → sims), and
   cut canon-v1.1 if the rules move.

## Open questions (Griff's chair — full list in CANON.md + the demo Audit tab)

Prison's fate (37/53/55) · base/home rename (54) · initiative + intercept feel · influence economy
(1–3% of competent games — intended upset rate?) · ratify the session-006 redesigns · adopt purple?

## Notes for the next session

- Read: this file → `docs/canon/CANON.md` → `docs/PLAYTESTS/001.md` → `DECISIONS.md` (46–55 +
  redesigns block). The implementation plan (executed, all tasks done) is at
  `docs/superpowers/plans/2026-07-09-canon-and-card-authoring.md`.
- Likely in the chair: **both** — Griff's ratify pass wants the designer; deploy + any PR triage
  is builder/agent work.
