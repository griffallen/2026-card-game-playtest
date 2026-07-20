# Current hand-off (2026-07-19 — docs canon reset in review)

**Phase:** Playtest & iterate. The game is stable on **red / yellow / purple** — all 120 cards
`canon`, 462 engine tests green. **Next in the chair:** **Blaine** (review PR `docs/canon-reset`),
then **Griff** (three design questions below). Model routing per **CLAUDE.md → Model routing**.

## Read first

**`docs/rules.md`** — the complete current rules, one file, always accurate. It is **generated**
from `apps/demo/src/pages/Rules.tsx`; run `npm run rules:doc` after any rules-prose change and
`npm run rules:doc:check` gates it. Then the open issues below.

## In flight

**PR `docs/canon-reset`** — the documentation reset. Deleted 19 superseded docs (the whole
rules lineage: `rules-v1.3.md`, `SPECS/game-rules.md`, `game-rules-v2.3.md`, `GAME-FLOW.md`,
`canon/CANON.md`), made `docs/rules.md` the single generated rules surface, rewrote all three
deck charters against the cards that actually shipped, flipped purple to `canon`, and fixed the
inverted tripwire (it pointed at `rules-v1.3.md`, a file with no consumers, so real rules changes
could ship as a `patch` while edits to a dead doc demanded a `major`).

## Open — needs Blaine

1. **#119** — ratify the two-authority model (engine + `data/cards` = what the game *does*;
   `DECISIONS.md` = *why*; every prose surface derived and checked). Already written into
   CLAUDE.md by this PR; #119 is where it gets Griff's and your sign-off. Also carries the
   engine-version bump (`packages/engine/package.json` is still `0.1.0`).
2. **#109** — the `docs` lane. The label exists; the written rule doesn't. One question left:
   may a doc-sync auto-commit like a `patch`? Recommended **yes, guarded** — it qualifies only
   if no engine or card file is touched and `test` + `rules:doc:check` + `cards:check` are green.
   This is why `DECISIONS.md` stalled at 106 and `RELEASES.md` at v0.6.0: doc upkeep had no lane
   and queued behind a human.
3. **Ledger backfill** — `DECISIONS.md` stops at decision 106 (2026-07-15) though the whole
   purple arc (#113/#115/#118/#120/#121/#122/#123/#124) landed after it; `RELEASES.md` has no
   line for that work. Backfill, or draw a line and start clean from here.
4. **`packages/ai` typecheck is broken on `main`** — 4 errors, `@newgame/corpus` unresolved.
   Pre-existing, unrelated to the docs work; needs its own ticket.
5. **`apps/server` + `apps/web` boot legacy `DEFAULT_RULES`** — intercept combat, the pre-v3
   model. Nobody plays the multiplayer lobby, so it has been silently wrong. Decide: retire it,
   or point it at `V3_RULES`.

## Open — needs Griff

1. **Politician: "counts anywhere" vs "must stand in the zone"** (#104). He was asked and never
   answered; we shipped *anywhere* as a reversible default. One line either way.
2. **#125 — rename Politician → Tribune**, plus a proposed on-play/on-leave influence swing.
   Undecided. The rename is now cheap on the doc side but still sweeps every carrier card's text.
3. **#66 — Breakthrough splash.** After the siege clause shipped (decision 102), an idea to
   splash excess onto a nearby unit in non-Home zones was floated, never ruled, and the issue
   closed under it. Revive as its own issue or drop it.

## Standing

The demo is the only surface anyone plays — `./scripts/deploy-demo.sh`, run unsandboxed, never
deferred to a human. Keyword text still lives twice (`apps/web/src/game/gloss.ts` and a second
`KW_GLOSS` in `UnitChip.tsx`); collapsing them makes the Tribune rename a one-file change.
