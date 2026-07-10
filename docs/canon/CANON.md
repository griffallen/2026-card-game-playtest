# CANON — the versioned baseline

**Current canon: canon-v1.0 — STAMPED 2026-07-09 (git tag `canon-v1.0`).** Red and yellow are fully reconciled; the purple proposal rides alongside as `draft` until adopted.

The canon is the *set* of documents the whole project builds against. Cards, UI copy, and engine
behavior are all checked against it; when playtests change the rules, we cut a **new** canon
version through the same process — locked baseline, never frozen forever.

## Members

| Document | Role | Version |
|---|---|---|
| `docs/SPECS/game-rules.md` | Base rules — the engine's contract | **v2.3** |
| `docs/canon/decks/red.md` | Red charter — deck law | canon-v1.0 |
| `docs/canon/decks/yellow.md` | Yellow charter — deck law | canon-v1.0 |
| `docs/canon/decks/purple.md` | Purple charter — **proposal, not yet canon** | draft |
| `data/cards/` | The card ledger (one file per card; source of truth — decision 46) | per-card `status` |
| `docs/DESIGN/DECISIONS.md` | The why-log | rolling |

**The anti-drift rule:** every card must satisfy **two parents** — the base rules (what a keyword
*does*) and its deck charter (what its color *may* do). The review gate asks three questions of
every card change: **valid?** (machine: `npm run cards:check`) · **consistent?** (does the printed
text match what the effects do, in canon vocabulary?) · **in-charter?** (does it obey its color's
laws?). Feel and balance stay human.

## Reconciliation status

- **Red: all 36 cards `canon`** (session 006 — Overextend stripped from actions per decision 47,
  dead Rush grants rebuilt, burn grammar unified, statline outliers fixed).
- **Yellow: all 48 cards `canon`** (session 006 — prison ladder re-priced with one job per rung,
  armor suite re-costed, Aura of Resolve made event-earned, decision-51 honest auto-target text).
- Every redesign is logged in the card's own "Design notes" — veto by editing the card file or
  opening an issue.

## Open questions (Griff's chair)

The live, merged list — ten v3.0 blockers + six canon-v1.0 questions — is on the demo's
**Design Audit tab** and in the GitHub issue tracker (each question is its own issue):

1. **The v3.0 rules pass** ([#9](https://github.com/booherbg/2026-card-game/issues/9)) — ten
   questions block the spec: pips semantics, blocker-pairing details, Hidden/Sneak/Capture edge
   cases, and Guard's new meaning. **Prison's fate is already answered there: cut.**
2. **Ratify the session-006 card redesigns** ([#4](https://github.com/booherbg/2026-card-game/issues/4)) — every change is on its card's Design notes.
3. **The purple deck: adopt / revise / shelve** ([#5](https://github.com/booherbg/2026-card-game/issues/5)).
4. **Influence economy** ([#6](https://github.com/booherbg/2026-card-game/issues/6)) — 4–10% upsets in mixed matchups, 23% in yellow mirrors.
5. **Claiming initiative feel** ([#7](https://github.com/booherbg/2026-card-game/issues/7)) — the intercept half of that issue is mooted by #9's combat rework.
6. ~~Naming and mulligan feel~~ — **answered** (issue #8, decisions 57–58): "Home"/"base" stay; mulligan style stays, London variant staged for A/B.
