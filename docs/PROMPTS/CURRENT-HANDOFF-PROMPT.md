# Current hand-off

**Phase:** Playtest & iterate.
**Next in the chair:** likely **Griff** (soft `designer` items) or **Blaine** (one `major` to fire).
Model routing per CLAUDE.md — Opus verifies/implements/ships; Fable rules and writes every
Griff-facing word.

**This doc is a pointer, not a snapshot.** It's written once at wrap and drifts, so it does
*not* carry the open-decision list or version numbers. Live state is on GitHub:

- **The Board — issue #129** — every open decision, by owner, with what it blocks and the default
  if unanswered. Rebuilt every watch tick. **The one place to see what's waiting on whom.**
- **`RELEASES.md`** — current version (through **v0.10.3**) and the build ledger.
- **`docs/rules.md`** — the complete current rules (generated; `npm run rules:doc` after any
  rules-prose change, `npm run rules:doc:check` gates it).

**Read first:** `docs/rules.md`, then the Board (#129), then CLAUDE.md → *Session protocol*
(the **autonomy** default + **banner-recognition** rule are new this session) and *Model routing*.

**Live situational notes (not yet canon elsewhere):**

- **Run autonomously — the console is not an approval gate.** Do the work; raise genuine human
  decisions on the GitHub thread, never idle waiting on someone in the chair (Blaine, 2026-07-21;
  now in CLAUDE.md).
- **One `major` waits on Blaine — #140 Regroup** (rename "initiative" → Regroup + 🥇 marker + rules
  phrase). Fully scoped, replay-safe, no balance change. Fire it (`build-now`) whenever.
- **#138's floor-play is the live balance signal:** yellow's influence clock (Tribune majority)
  only ticks from Neutral or the enemy's Home — a fortress-at-home deck can't start it. Griff's own
  #98 win confirms it (leave the fortress → wins, but a 20-round marathon). Soft, Griff's call.
- **Housekeeping (undecided):** `_pt_*.ts` scratch and an untracked-not-ignored **`data/corpus/`**
  (the growing #97/#98 game corpus — commit or gitignore?), plus a stale `worktree-agent-*` to
  prune. None blocking.
- **Watch loop is stopped** (cron cancelled at wrap). Re-arm with `/loop 4m /watch`.
