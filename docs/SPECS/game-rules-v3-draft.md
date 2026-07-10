# Game Rules Spec — v3.0 DRAFT (not canon; do not implement yet)

**Status:** skeleton built from the designer's rules pass
([issue #9](https://github.com/booherbg/2026-card-game/issues/9), parsed in
`docs/DESIGN/05-V3-DIRECTION.md`). Sections marked **[Qn]** are blocked on the numbered questions
on that issue; everything else is settled enough to implement once the whole draft is ratified.
`game-rules.md` (v2.3) remains the engine's contract until this replaces it.

---

## 1. Deltas from v2.3

### 1.1 Setup / round structure — unchanged, plus one clarification
Round 1 skips the ready step by construction (nothing is in play, resources were just banked);
the rules text now says so instead of implying a phantom step.

### 1.2 Colored resource pips — NEW ECONOMY
A card's cost is `cost` total, of which `pips` (0..cost) are colored. Paying requires exhausting
one matching-color resource per pip; the remainder takes any resources.
- A banked card provides **[Q1: its faction color? its own pips?]** as its resource color.
- A multi-pip card banked as a resource pays as **any one** of its colors, chosen when spent
  **[Q2: confirm at-spend-time choice]**.
- `pips` is a designer-owned field in the card file **[Q3: confirm]**.
- Cards with zero pips cost pure-generic (and future colorless cards bank as colorless).
- Engine: `CardDef.pips?: Color[]`; resource row entries carry a color; payment validation in
  `playCard`; deck legality probably unchanged (pips constrain play, not deckbuilding — confirm
  later).

### 1.3 Combat — blocker pairing (replaces combined-hit + intercept, decision 42)
1. **Declare:** attacker exhausts a group of ready units in one zone, attacking **that zone**.
2. **Block:** the defender assigns any of their ready units in that zone as blockers — 1v1 or
   several blockers on one attacker. Blocking does not exhaust **[assumption — confirm]**.
3. **Resolve simultaneously, per pairing:** attacker deals its power to its blocker(s)
   **[Q5: who splits damage across multiple blockers?]** and takes their combined power back.
4. **Unblocked attackers:** hit the enemy **base** if the zone is that player's Home
   **[Q4: and in Neutral — nothing? something?]**.
5. **Breakthrough (new semantics, no N):** excess damage beyond a killed blocker carries over —
   to another unit in the zone or the base (if in the owner's Home zone)
   **[Q6: who chooses the spill target?]**.
6. **Guard:** the intercept window no longer exists, so Guard needs a new meaning
   **[Q10: e.g. "attackers must be blocked by Guards first"? "may block one extra attacker"?
   "must be attacked before the base"? — designer's call]**.

### 1.4 Moving — unchanged, minus Flying
Adjacent-zone move, exhausts the unit (Rush's first-move waiver unchanged). All flying text gone.

## 2. Keyword set v3

### Removed
`overextend` (and its attack-declaration UI), `flying`, `reach`, `untargetable` (superseded by
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
| **Scar** | This unit gets **+1 power for each damage marked on it**. | Clear; power derivation from `damage`. Red's post-Overextend identity candidate. |

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
Q1–Q9 live on [issue #9](https://github.com/booherbg/2026-card-game/issues/9); **Q10 (Guard's
meaning under blocking)** was added while drafting this. Answers slot directly into the marked
holes above.
