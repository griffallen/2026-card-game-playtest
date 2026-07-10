# Game Rules Spec — v3.0 DRAFT (not canon; do not implement yet)

**Status:** Q1–Q6 answered by the designer (2026-07-10, on the issue) and folded in below.
**Remaining blockers: Q7–Q10** (Hidden-blocks, Sneak payloads, Capture return state, Guard's new
meaning). Pip *assignments* are a separate proposal track (designer asked for drafts —
`docs/DESIGN/06-PIP-PROPOSAL.md`). `game-rules.md` (v2.3) remains the engine's contract until
this replaces it; formal DECISIONS entries (59+) get cut when the set completes.

---

## 1. Deltas from v2.3

### 1.1 Setup / round structure — unchanged, plus one clarification
Round 1 skips the ready step by construction (nothing is in play, resources were just banked);
the rules text now says so instead of implying a phantom step.

### 1.2 Colored resource pips — NEW ECONOMY *(Q1–Q3 answered)*
A card's cost is `cost` total, of which `pips` (0..cost) are colored. Paying requires exhausting
one matching-color resource per pip; the remainder takes any resources.
- **[Q1 ✓]** A banked card provides the colors of **its own cost pips** (MTG-style: a card costing
  1UW banks as Blue *or* White). Pip-less cards bank as colorless (pay generic only).
- **[Q2 ✓]** Multi-pip resources choose their color **at spend time**; one card = one resource.
- **[Q3 ✓]** `pips` is a designer-owned card-file field. Initial policy: mono-color pips only;
  **stronger cards carry more pips of their own color** — the splash tax is a deliberate balance
  lever for big/good cards (cf. MTG CC costs, SWU aspects). Agent drafts proposals
  (`docs/DESIGN/06-PIP-PROPOSAL.md`); playtesting tunes.
- Engine: `CardDef.pips?: Color[]`; resource row entries carry a color set; payment validation in
  `playCard`; deck legality unchanged (pips constrain play, not deckbuilding).

### 1.3 Combat — target-declared, blocker-paired *(Q4–Q6 answered; replaces combined-hit + intercept)*
1. **Declare:** attacker exhausts a group of ready units in one zone and declares **one target:
   an enemy unit there, or the enemy's Home** (Home only while standing in that zone, as today).
2. **Block:** the defender assigns any of their ready units in that zone as blockers, pairing
   them onto attackers — 1v1 or several blockers ganging one attacker. Blocking does not exhaust
   **[assumption — echoed for confirmation on the issue]**.
3. **Resolve simultaneously, per pairing:** each attacker fights its blocker(s); **[Q5 ✓] in a
   gang-block the DEFENDER divides the attacker's damage** among the blockers; blockers' combined
   power hits the attacker back.
4. **[Q4 ✓] Unblocked attackers deal their full damage to the declared target** (unit or Home).
5. **[Q6 ✓] Breakthrough** (no number): excess damage from a killed blocker pushes through **to
   the original declared target**. No choices; fully deterministic.
6. **Guard:** the intercept window no longer exists, so Guard needs a new meaning
   **[Q10 — open: "must be blocked first"? "blocks an extra attacker"? "must be attacked before
   the Home"? retire?]**.

### 1.4 Moving — unchanged, minus Flying
Adjacent-zone move, exhausts the unit (Rush's first-move waiver unchanged). All flying text gone.

## 2. Keyword set v3

### Removed
`overextend` (and its attack-declaration UI), `flying`, `reach` (designer re-confirmed, issue #8), `untargetable` (superseded by
Hidden), the entire **prison** package (imprison/release ops, decay, release threshold,
`imprisonWatcher`, §1.11 — resolves decisions 16/37/53).

### Changed
- `ranged` — may attack an adjacent zone; cross-zone draws no retaliation; **same-zone attacks
  retaliate normally** (matches current engine behavior; text clarified).
- `breakthrough` — loses N; pushes all excess damage (see 1.3.5).

### Kept as-is
`guard` (pending [Q10] redefinition), `armor N`, `rush`, `cantAttack`.

### New
| Keyword | Semantics | Notes / holes |
|---|---|---|
| **Hidden** | While this unit is **ready**, it can't be targeted by enemy actions or declared as an attack target. | Attacking/exhausting reveals it until it readies. **[Q7: can a Hidden unit block? assume yes]** Engine: targeting filter + attack-eligibility keyed on `exhausted`. |
| **Sneak** | Exhaust-activated ability, per card: "Sneak — [effect]" hits a target in this unit's zone (unit or base). | Finally builds §1.9's deferred `activate` action. **[Q8: confirm per-card payloads]** |
| **Capture** | On its trigger, this unit takes an enemy unit **under itself** (out of play, no zone presence). The captive returns when the capturer leaves play — or when the capturer readies; its owner **may decline to ready the capturer** at their ready step to keep holding. | Prison's successor with a body-attached cost (the capturer stays exhausted = can't block/attack under [Q10]/1.3). **[Q9: captive returns ready or exhausted?]** |
| **Infiltrate** | May be deployed to **any zone**, not just its owner's Home. | Clear; deploy-time zone choice in the play action. |
| **Shielded** | Enters play with a shield token; the first instance of damage it would take is prevented entirely and the token is removed. | Clear. "Instance" = one damage event (combat hit, one effect op). |
| **Scar** | This unit gets **+1 power for each damage marked on it**. | Clear; power derivation from `damage`. **Designer-confirmed as Overextend's successor** (red's identity). |

## 3. Effect-vocabulary deltas
- Remove: `imprison`, `release` (reserved), `imprisonWatcher` static.
- Add: `capture` (op/trigger bookkeeping), shield-token grant, `pips` card field, per-card Sneak
  ability payloads (reuse the existing op vocabulary as the ability body).
- `thresholdMod`/`oppThreshold` unaffected. Auto-target defaults (decision 51) carry over to any
  capture/sneak auto-picks.

## 4. Migration sketch (for the build plan)
1. Decisions 57+ from the answered questions → finalize this file → rename over `game-rules.md`
   as **v3.0**; v2.3 stays selectable as a rules version for A/B.
2. Engine order: pips (isolated, big test surface) → keyword suite (mostly local mechanics) →
   combat rework last (touches everything; reuse the paired-action event pattern from intercept).
3. Full card re-churn against the v3 keyword set (red→Scar, yellow→Capture/Shielded,
   purple→Hidden/Infiltrate/Sneak if adopted), then canon-v2.0.

## Open questions index
**Answered (2026-07-10):** Q1–Q6 — folded in above. **Open:** Q7 (Hidden block eligibility),
Q8 (Sneak per-card payloads), Q9 (captive's return state), Q10 (Guard's meaning), plus one
echoed assumption (blocking doesn't exhaust). All on
[issue #9](https://github.com/booherbg/2026-card-game/issues/9).
