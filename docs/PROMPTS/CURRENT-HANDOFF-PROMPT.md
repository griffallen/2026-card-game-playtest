# Current hand-off

**Phase:** Playtest & iterate.
**Next in the chair:** likely **Griff** (open `designer` decisions) or **Blaine**. Model routing per CLAUDE.md.

**This doc is a pointer, not a snapshot.** It's written once at wrap and drifts, so it does
*not* carry the open-decision list or version numbers. Live state is on GitHub:

- **The Board — issue #129** — every open decision, by owner, with what it blocks and the
  default if unanswered. Rebuilt every watch tick, always current. **This is the one place to
  see what's waiting on whom.**
- **`RELEASES.md`** — current version and the build ledger.
- **`docs/rules.md`** — the complete current rules (generated; run `npm run rules:doc` after
  any rules-prose change, `npm run rules:doc:check` gates it).

**Read first:** `docs/rules.md`, then the Board (#129), then CLAUDE.md → *Model routing* and
*Build workflow*.

**Live situational caution (not yet canon elsewhere):**

- **Red is fine for now — do not scope a balance pass off the current sim numbers.** They read
  red ahead, but they're **heuristic bot vs heuristic bot** (decision 107): they measure the
  bot's red against the bot's yellow, not the game. The real prerequisite is a better bot —
  that is what **#97** (learned eval) and **#98** (the game corpus) are for. Balance work with
  trustworthy numbers waits on that. Yellow is the genuine weak color in live play; **#138**
  (Sentry) is Griff's proposed lever for it, still unpinned.
