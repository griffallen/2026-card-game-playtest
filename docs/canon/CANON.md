# CANON — the versioned baseline

**Current canon: canon-v1.0 — STAMPED 2026-07-09 (git tag `canon-v1.0`).** Red and yellow are fully reconciled; the purple proposal rides alongside as `draft` until adopted.

The canon is the *set* of documents the whole project builds against. Cards, UI copy, and engine
behavior are all checked against it; when playtests change the rules, we cut a **new** canon
version through the same process — locked baseline, never frozen forever.

## Members

| Document | Role | Version |
|---|---|---|
| `docs/SPECS/game-rules.md` | Base rules — the engine's contract | **v2.2** |
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

1. **Prison's fate** (decisions 37/53) — keep, cut, or rework? Blocks ~15 yellow cards' identity.
2. **Base/home rename** (decision 54) — Banner / Hearth / Seat / Beacon, or stay "base"?
3. **Claiming initiative** — does trading your whole round for next round's first move feel good?
4. **Intercept window** — is one redirect per attack the right defender agency?
5. **Influence economy** — ~5% of games end by the track. Intended upset rate, or should it bite
   harder (threshold 15 → lower, or bigger event payouts)?
6. **Session-006 redesigns** — every card the agent redesigned tonight is listed in
   `DECISIONS.md` under "Session-006 card redesigns" and needs your ratify-or-veto.
7. **Purple** (if it shipped this session) — adopt, revise, or shelve the third color.
