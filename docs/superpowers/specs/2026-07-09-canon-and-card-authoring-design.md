# Canon & Card-Authoring System — Design

**Date:** 2026-07-09
**Status:** Design approved in shape (builder, session 005). Awaits a spec review, then `writing-plans`.
**Working with:** builder (Blaine); Griff is the designer whose intent this system captures.
**Supersedes / refines:** decision 45 (see Decision 1 below), and formalizes the "middle layer" the project never wrote down.

---

## Problem

The rules layer is solid (`docs/SPECS/game-rules.md` v2.1-proto, 99 tests). The **card layer is the soft spot**: the 84 cards are still the July AI-generated drafts and have drifted from the rules that evolved around them. Evidence lives in the CSV itself — Overextend is **inert** on ~15 red actions, half the card text still says "this turn" (rules now say **round**), and a dozen cards carry `⚑ needs design / reinterpreted / meaningless as printed` notes. The "designer CSV pass" has been the owed TODO since decision 39.

**Why the drift happened — the structural gap.** There are three layers of truth, and only two were written down:

| Layer | Where it lives | Status before this work |
|---|---|---|
| **Base rules** | `docs/SPECS/game-rules.md` + `RulesConfig` | authoritative, tested |
| **Per-deck rules** (Red = Rush/Overextend/burn; Yellow = Prison/Influence/Guard) | scattered across `DECISIONS.md`, `04-COLORS-ROADMAP.md`, people's heads | **not a first-class artifact** |
| **Cards** | `data/cards.csv` + engine TS | drafts, drifted |

Cards had nothing to be consistent *against* except a 200-line engine spec no designer will read. Rush drifted because its second parent — a statement of what the mechanic means for its color and what a card using it must obey — never existed.

**The cure is canonical-first:** lock a base + per-deck canon, reconcile every card against it once, then keep them in sync with a branch → PR → AI-review loop. "Setting the agent up for success" = an input contract precise enough that the agent never guesses what a card is supposed to do.

## Sequencing (agreed)

Job classification (c): both normalize *and* redesign, **tracked separately**. Hard order:

1. **Finalize the rules canon** (base rules + charters), then
2. **Churn the cards** (modify / create / destroy) until two decks sit consistently on top of the canon.

"Finalize" means **lock a versioned baseline to build against — not freeze forever.** When playtests move the rules, cut a *new* canon version through the same process (CLAUDE.md is explicit the rules keep evolving).

---

## The canon — one versioned baseline

Canon is a *set* of documents at a tagged version (git tag `canon-v1.0`), not a single file.

```
docs/canon/
  CANON.md            index: current canon version + which cards are reconciled to it
  decks/red.md        charter: identity · allowed keywords · invariants · curve · influence posture
  decks/yellow.md     charter
docs/SPECS/game-rules.md   base rules — stamp v2.1-proto → v1.0 (STAYS PUT; it is the engine contract)
docs/GAME-FLOW.md          designer-facing rules (STAYS PUT; kept in sync)
data/cards.csv             the card ledger (single source of truth — see Decision 1)
docs/DESIGN/DECISIONS.md   the "why" log (continues)
```

**New artifacts = only the two charters + the thin `CANON.md` index.** Everything else already exists — we version it and close one split-brain. Heavily cross-referenced files (`game-rules.md`, `GAME-FLOW.md`, `cards.csv`) stay where they are; `CANON.md` names them as canon members rather than moving them.

**The anti-drift rule, in one line:** every card must satisfy **two parents** — the **base rules** (what a keyword *does*) and its **deck charter** (what its color *may* do).

---

## Decision 1 — card truth lives in the CSV (source-of-truth flip)

**Chosen: A — `data/cards.csv` becomes the single source of truth.**

Today it is a dormant split-brain: `packages/engine/src/cards/red.ts` + `yellow.ts` are authoritative and `overrides.json` is `{}`, so the CSV is a dead layer. Verified this session that the CSV round-trips a full card losslessly (`cards-export.ts` dumps every structural field into `effectsJson`; only `artUrl` is derived, and the `custom` escape hatch is empty). So the flip is safe.

**Target pipeline:**
- `data/cards.csv` (human + agent editable) → `scripts/cards-import.ts` **validates + compiles** → generated JSON → the engine loads it as `CARD_SET`.
- `red.ts` / `yellow.ts` (data arrays) retire; the `CardDef` types, the `unit/action/upgrade` builders, and `validateCardSet` **stay** (still used by the engine, tests, and the importer).
- `cards-export.ts` retires (or becomes a one-time migration only).

**Trade-off accepted:** structural edits ride as JSON in a CSV cell — ugly to *hand*-edit, but **nobody hand-edits it**: the agent authors `effectsJson`, and `validateCardSet` guards it. Card typing moves compile-time → import-time (arguably better — import-time also checks the effect vocabulary, not just TS types). Add `scripts/cards-import.ts --show <slug>` to pretty-print a card's resolved effects for human review.

**This overturns decision 45's "TS authoritative until the admin UI" holding pattern — deliberately**, because we are now building the file-based authoring system that pattern was waiting for. The eventual admin UI (⚑26) edits the same CSV/generated layer.

**To verify during implementation:** the generated-JSON load path works for the DB seed + game snapshot; no card in `red.ts`/`yellow.ts` carries structure the CSV cannot represent (spot-check auto-target metadata, `custom`, statics).

## Decision 2 — what a deck charter holds

One page per color, Griff-readable, `docs/canon/decks/<color>.md`:

1. **Identity** — the one-sentence fantasy ("Red: spend your own resources for tempo").
2. **Keyword allowance** — which keywords this color may print, and what each *means for this color*.
3. **Invariants** — the design laws the lint enforces. Red examples: *Overextend is a unit combat gamble, never printed on actions*; *Red never gains passive Influence*; *no defensive keywords*.
4. **Curve & size** — card count, cost distribution, unit/action/upgrade mix — the "standard base set" target.
5. **Influence posture** — how this color may touch the shared Influence track (Yellow earns on events; Red only feeds the opponent's).

(Exact template settled while writing red.md first, then generalized to yellow.md.)

## Decision 3 — the authoring loop + two lanes + review gate

**Ledger gets a `status` column:** `canon` (reconciled + locked) · `draft` (not yet) · `redesign` (flagged for real design work). "Lock in what a card does" = status flips to `canon`. A deck is a finished base set when **all** its cards are `canon` at the current canon version.

**Two lanes (job classification c):**
- **Normalize (a):** the canon *is* the intent. The agent opens the PR proposing the diff (text→round, kill inert Overextend, make ⚑ reinterpretations real); the humans ratify. High-volume, cheap.
- **Redesign (b):** starts from **Griff**. He writes intent in prose on the card's PR/issue ("Prison should punish the jailer harder"); the agent turns it into row + `effectsJson`; the *why* lands in `DECISIONS.md`. This is the input contract — the agent never guesses a redesign card's intent.

**The AI-review gate** (honoring decision 45 — no CI; the agent is the gate). On every card PR the agent answers three questions:
1. **Valid?** `validateCardSet` passes *(machine)*.
2. **Consistent?** Does printed `text` match what `keywords` + `effectsJson` actually do, in current-canon vocabulary? *(catches "this turn", inert Overextend, dead riders.)*
3. **In-charter?** Does the card obey its color's invariants + keyword allowance?

Feel and balance stay human — Blaine + Griff playtest + sim. The agent does not rubber-stamp balance.

**Division of labor (confirmed):**
- **Griff** — feel + the tunable columns (name/cost/power/health/keywords/text/influenceTrigger/designerNote) + redesign intent.
- **Agent** — structure (`effectsJson`), normalization proposals, the three-question review, engine wiring.
- **Both** — ratify; playtest for feel/balance.

---

## The loop (step 2)

A `docs/canon/*` or `data/cards.csv` edit → dedicated branch → PR → agent reviews (three questions above) and implements → merge. Locking a canon set = git tag `canon-vN.M` + updating `CANON.md`.

## Sequence

- **Phase 1 — rules sprint.** Rule the open ⚑ questions (Prison's fate/dec 37, Flying, the base/home rename, the Radiant-Citadel-style reinterpretations, influence threshold, Overextend-on-actions' final disposition), write `red.md` + `yellow.md` charters, stamp `canon-v1.0`. A decision sprint, not a rewrite — `game-rules.md` is ~90% there.
- **Phase 2 — card churn.** Flip the source of truth (Decision 1), then normalize-lane the whole pool against canon, then redesign-lane the flagged handful, until every Red/Yellow card is `status: canon`.

## Open items to settle in Phase 1 / implementation

- Exact `CANON.md` and charter templates (write red.md first, generalize).
- Exact `status` values + where the column sits in the CSV.
- Migration steps + verification for the Decision 1 flip (DB seed / snapshot; lossless round-trip spot-check).
- Whether the branch-per-edit workflow uses GitHub PRs or local branches for the two-person interim.
- The Phase-1 open-rules-question list is the sprint agenda; capture each ruling in `DECISIONS.md` as it lands.

---

## Amendments (session 006, 2026-07-09 — reviewed with Blaine)

1. **Decision 1's representation changes: one markdown file per card**, `data/cards/<color>/<slug>.md`
   (YAML-style frontmatter + card text as the body), replacing the single CSV. The *substance* of
   Decision 1 is unchanged — file layer authoritative, TS retires, agent validates every change.
   Why the format flip: card text escapes CSV quoting entirely (it's the field the designer edits
   most and the field CSV is worst at); a bad edit's blast radius is one card, not the parse of
   every row after it; per-card `git log` is the card's design history; parallel PRs on different
   cards can't conflict; and GitHub renders each file as a readable card page. The CSV's
   single-table overview survives as a **generated, read-only `data/cards/INDEX.md`**.
   `status` (`draft`/`redesign`/`canon`) becomes a frontmatter field — authoring metadata, never
   part of `CardDef`.
2. **No backwards version stamp.** `game-rules.md` keeps its own version line (v2.1, `-proto`
   dropped at lock). `CANON.md` pins canon members at their own versions; `canon-vN.M` tags the set.
3. **Stale claim corrected:** the "half the card text still says 'this turn'" evidence was already
   fixed by the 2026-07-08 vocabulary sweep (0 occurrences in CSV and TS base). The normalize lane
   is smaller than estimated; the ⚑ reinterpretations (mostly design rulings) dominate.
4. **Card license (Blaine):** the 84 cards are drafts, not commitments. Churn should produce
   *clean, easy-to-rectify values* and prose with zero ambiguity — redesign freely where a card's
   printed idea is confused, logging the why in `DECISIONS.md`.
5. **Scope added mid-session (Blaine):** a fresh-eyes UX audit of the demo (+fixes), a red/yellow
   balance pass through their charter identities, a playable **purple** deck built strictly from
   existing engine mechanics (SVG placeholder art direction), and a synchronization audit of the
   full game (apps/web + server) against tonight's canon. See the implementation plan.
