# Current Hand-off

**Phase:** **Design** — a canon & card-authoring *process* was designed this session (005). The design
is approved in shape and captured in `docs/superpowers/specs/2026-07-09-canon-and-card-authoring-design.md`.
Next is a spec review, then **Phase 1: the rules-canon sprint**.

## State

- **The process is designed, not yet built.** No rules or code changed in session 005 — it was
  design only. Read the spec first: `docs/superpowers/specs/2026-07-09-canon-and-card-authoring-design.md`.
- **The problem being solved:** the 84 cards are drifted July drafts (Overextend inert on ~15 red
  actions, "this turn" text vs. the rules' "round", a dozen ⚑ "needs design" notes). Root cause: the
  **middle layer** — the rules each deck introduces + the invariants its cards must obey — was never
  written down, so cards had nothing to be consistent against. Rush is the poster child.
- **The system (approved):** one **versioned canon** = base rules (`game-rules.md`, stamp proto→v1.0)
  + a **charter per deck** (`docs/canon/decks/*.md`, the new middle layer) + the **card ledger**
  (`data/cards.csv`, flipped to the single source of truth). Anti-drift rule: every card obeys **two
  parents** — base rules + its deck charter. Loop: branch → PR → the agent reviews (valid? text↔effects
  consistent? in-charter?) and implements; a `status` column (`canon`/`draft`/`redesign`) makes
  "locked in" concrete; feel + balance stay human.
- **Decision 1 = A:** `cards.csv` becomes authoritative; the engine generates from it; `red.ts`/`yellow.ts`
  retire (types + `validateCardSet` stay). Deliberately overturns decision 45's TS-authoritative holding pattern.
- **Git:** `main` is pushed and up to date on `origin` (the old "nothing pushed" note was stale); tags
  `v0.1`/`v0.2` present. Session 005's wrap-up (spec + summary + this handoff) is committed and pushed.
- **The live demo at https://blainebooher.com/new-game-demo/ still runs the OLD v1.2 build** — redeploy
  with `./scripts/deploy-demo.sh` is still a carried item (v0.2 was never put in front of Griff).

## Do next

1. **Review the spec** (`.../2026-07-09-canon-and-card-authoring-design.md`) — confirm or redline before executing.
2. **Phase 1 — rules-canon sprint** (design dialogue, wants Griff's input on feel questions): rule the
   open ⚑ questions below, write `red.md` + `yellow.md` charters, then stamp `canon-v1.0`. It's a
   decision sprint, not a rewrite — `game-rules.md` is ~90% there.
3. **Phase 2 — card churn** (write an implementation plan once canon is stamped): do the Decision-1 CSV
   flip, normalize-lane the pool against canon, then redesign-lane the flagged handful, until every
   Red/Yellow card is `status: canon`.

## Open ⚑ questions — the Phase 1 sprint agenda

- **Prison's fate** (decision 37, "on notice"): keep / cut / rework? Blocks Yellow's charter and ~15 cards.
- **Overextend on actions**: currently inert; the Red charter's likely invariant is "unit-only" → strip it from actions and retext.
- **The base/home rename** (Banner/Hearth/Seat/Beacon) — pick or drop.
- **Flying** (undefined; currently "move to any zone"), **Radiant Citadel** (opponent-threshold +2), and
  the other card-text reinterpretations — rule them for real or cut.
- **Influence win threshold** (15) and **mulligan** feel.
- **Playtest-driven feel** (carried): does *claiming initiative* feel good? is one intercept per attack
  the right defender agency? These feed the charters and any rules tuning.

## Notes for the next session

- Blaine intended to switch the model to **Fable** for the next session (couldn't switch mid-session on
  the remote terminal). Context does not carry across a new session — start by reading this handoff, the
  spec doc, `game-rules.md`, `DECISIONS.md`, and `data/cards.csv`.
- Likely in the chair: **both** — Phase 1's feel questions (Prison, rename, thresholds) want the designer;
  the CSV flip is builder + agent.
