# Game Rules Spec — v3.0 (CANON — the engine's contract)

**Status:** SHIPPED 2026-07-11 (the night build; Blaine's order on #12). Built from the
designer's answered questions (#9 Q1–Q10), the color charter (#10), and decisions 59–70.
The v2.3 spec is archived at `game-rules-v2.3.md` and stays selectable in the engine/demo
for A/B play. Deltas below are stated against v2.3.

---

## 1. Deltas from v2.3

### 1.1 Setup / round structure — one structural change (decision 71, issue #20)
**Round 1 has no start step at all** — no ready, no draw, no bank. Setup ends with each player
holding their opening hand (minus the 2 banked starting resources), and round 1 opens straight
into the action loop. The first start step (ready → draw 2 → bank up to 1) arrives with
round 2. Reverses decision 44's "no first-round asymmetry" for v3; engine knob
`firstRoundStartStep` (v2.3 keeps `true`). Everything else in §1.4 (v2.3) is unchanged.

### 1.2 Colored resource pips — PRESENCE MODEL *(Q1–Q3 answered; REVISED by issue #15, decision 69)*
Cost and color are now two separate checks:
- **Cost (payment):** exhaust any `cost` resources — color-blind, unchanged from v2.3.
- **Pips (presence requirement):** to play a card, your resource zone must **contain** enough
  color sources — for each color, at least as many providing cards as the card has pips of that
  color. **Pips never exhaust anything.** (SWU-aspect-style gate, not MTG-style payment —
  revision of the original Q1–Q3 payment model, designer's call on #15 after the 0-cost ruling.)
- **What a banked card provides:** 1 presence of **each** color in its own cost pips —
  a red+blue card provides 1 red AND 1 blue; a card with 4 red pips still provides only
  **1 red** (same-color pips never stack on the providing side). Pip-less cards provide nothing
  (colorless).
- **Consequences:** 0-cost cards can carry pip requirements (no payment needed, gate still
  applies — closes the splash-tax escape flagged on PR #14). Heavy same-color pip costs (RRR)
  demand that many *distinct* banked red cards — the splash tax moves entirely into
  deck-building/banking choices; turn-to-turn payment stays simple.
- **[Q3 ✓ still stands]** `pips` is a designer-owned card-file field; the approved assignment
  baseline (`docs/DESIGN/06-PIP-PROPOSAL.md`, decision 66) carries over — the numbers now read
  as presence requirements.
- Engine: `CardDef.pips?: Color[]`; banked entries expose a color set; `playCard` validates
  presence (count providing cards per color ≥ pip count), then exhausts any `cost` resources.

### 1.3 Combat — target-declared, blocker-paired *(Q4–Q6 answered; replaces combined-hit + intercept)*
1. **Declare:** attacker exhausts a group of ready units in one zone and declares **one target:
   an enemy unit there, or the enemy's Home** (Home only while standing in that zone, as today).
2. **Block:** the defender assigns any of their ready units in that zone as blockers, pairing
   them onto attackers — 1v1 or several blockers ganging one attacker. **The declared target
   may itself block its attacker** (self-defense is a block like any other — engine ruling
   during the build; without it a lone ready unit takes free hits with no reply). **Blocking
   exhausts the blocker** (Guard excepted, see 1.3.6) **[derived from Q10 ✓ — "Guards don't
   exhaust to defend" is only a perk if everyone else does; echoed on the issue for veto]**.
   The earlier draft assumption (blocking is free) is dead. In a gang block the defender's
   **pair order is the pour order** — the attacker's damage fills each blocker in sequence
   (deterministic split under the defender's control, decision Q5). *(Decision 80 removed the
   cross-zone Ranged sniper shot — all v3 attacks happen within one zone and open the window.)*
3. **Resolve simultaneously, per pairing:** each attacker fights its blocker(s); **[Q5 ✓] in a
   gang-block the DEFENDER divides the attacker's damage** among the blockers; blockers' combined
   power hits the attacker back.
4. **[Q4 ✓] Unblocked attackers deal their full damage to the declared target** (unit or Home).
5. **[Q6 ✓] Breakthrough** (no number): excess damage from a killed blocker pushes through **to
   the original declared target**. No choices; fully deterministic. *(Decision 75: the ten red
   cards that still printed "Breakthrough N" shed their numbers — the printed cap was already
   dead under this rule.)*
6. **[Decision 74 — "a kill is a kill" (issue #24 Q2, designer)]** "When this defeats a unit"
   triggers fire for the unit whose combat damage felled the victim, on either side of the
   pairing: an attacker credits each blocker it fells, blockers credit the attacker they fell,
   and the declared target's death credits **only the attackers whose damage actually reached
   it** (unblocked or spilling through) — an idle, fully-blocked attacker never collects on an
   ally's kill. Simultaneous trades credit both sides.
7. **[Decision 78 — base-trigger vocabulary (issue #24 Q7, designer)]** "When this **attacks**
   a base" fires only for a declared, unblocked attack reaching the base — Breakthrough spill
   is aftermath, not an attack. A second trigger, "when this **damages** a base" (any base
   damage, spill included), is **reserved vocabulary**: the engine implements it with the
   first card that prints it.
6. **[Q10 ✓] Guard: "does not exhaust to defend."** A Guard blocks without exhausting — it can
   block again this round and is still ready on its own turn. Designer's framing: start simple,
   give Guards a defending bonus later **only if playtesting shows they need it** (candidate
   knob, not spec).

### 1.4 Moving — unchanged, minus Flying
Adjacent-zone move, exhausts the unit (Rush's first-move waiver unchanged). All flying text gone.

### 1.5 Upgrades — orphaned, salvageable, stealable *(NEW — designer, issue #12; decision 67)*
When a unit dies, its upgrades **stay in that zone, orphaned** (they no longer die with the
wearer). As a **turn action, either player** may attach an orphaned upgrade in a zone to a unit
they control **in that zone**, paying the upgrade's full cost — resources *and* pips. Can't
pay → can't attach. Battlefield salvage: your dead champion's sword is anyone's prize.
Engine: upgrade gains an `orphanedIn: ZoneId` state; new `attachOrphan` turn action; cost check
identical to playing the card. **[Decision 79 (issue #24 Q8, designer)]: salvage is not playing** —
"when you play this" text does not re-run on a salvaged upgrade.
**[Decision 83 (issue #24, designer: "cut the greed tax")]:** the inherited v1.2 **upgrade-pressure
rule is CUT in v3** — stacking upgrades no longer pays the opponent influence. (It survives in the
classic v2.3 config; if anti-stacking tension is ever wanted again, it returns as a card.)

## 2. Keyword set v3

### Removed
`overextend` (and its attack-declaration UI), `flying`, `reach` (designer re-confirmed, issue #8), `untargetable` (superseded by
Hidden), the entire **prison** package (imprison/release ops, decay, release threshold,
`imprisonWatcher`, §1.11 — resolves decisions 16/37/53).

### Changed
- `ranged N` — **[Decision 80 (issue #24 Q9, designer) — full rework]** an **ability action**:
  exhaust this unit to deal **N damage to one enemy unit in any zone** (a chosen target — ready
  Hidden units refuse it, decision 76; a lethal volley credits onKill, decision 74). Its
  **attacks are ordinary** — same zone, blockable, base-legal, counter-able. Ranged bodies carry
  deliberately low attack power (the teeth live in the volley). Color law: Ranged is **reserved
  for Blue's future identity**; purple keeps two archers and otherwise leans on non-attack
  keywords. The v2.3 sniper-shot semantics survive only under the classic ruleset.
- `breakthrough` — loses N; pushes all excess damage (see 1.3.5).

- `guard` — **redefined [Q10 ✓]:** no longer an intercept trigger; a Guard **does not exhaust
  when assigned as a blocker** (see 1.3.2/1.3.6).

### Kept as-is
`armor N`, `rush`, `cantAttack`.

### New
| Keyword | Semantics | Notes / holes |
|---|---|---|
| **Hidden** | While this unit is **ready**, it can't be targeted by enemy actions or declared as an attack target. | Attacking/exhausting reveals it until it readies. **[Q7 ✓] A Hidden unit CAN block** (blocking isn't being attacked) — though blocking exhausts it (1.3.2), so blocking also reveals it. The self-revealing rhythm is the design. **[Decision 76 (issue #24 Q5, designer)]: Hidden beats *choices*, not consequences** — automatic picks ("strongest other"), zone-wide effects, and anything that says "all" still reach it. Engine: targeting filter + attack-eligibility keyed on `exhausted`. |
| **Sneak** | Exhaust-activated ability, per card: "Sneak — [effect]" hits a target in this unit's zone (unit or base). | Finally builds §1.9's deferred `activate` action. **[Q8 ✓] Per-card payloads confirmed** — designer's examples: attack for less than full power; forbid the opponent from blocking. |
| **Capture** | On its trigger, this unit takes an enemy unit **under itself** (out of play, no zone presence). The captive returns when the capturer leaves play — or when the capturer's owner spends a **turn action to release it** (which also readies the capturer). | Prison's successor. **[Decision 73 (issue #24 Q1, designer) — supersedes Q9/decision 61 and the exhausted-grip draft]:** capturing charges **no readiness cost** (the removal is temporary in a game rich with permanent answers; costs live in card rates), and **the freed captive returns READY**. |
| **Infiltrate** | May be deployed to **any zone**, not just its owner's Home. | Clear; deploy-time zone choice in the play action. |
| **Shielded** | Enters play with a shield token; the first instance of damage it would take is prevented entirely and the token is removed. | Clear. "Instance" = one damage event (combat hit, one effect op). **[Decision 77 (issue #24 Q6, designer)]: as a blocker, the shield soaks the attacker's ENTIRE pour** — the wall absorbs the whole assigned chunk and shrinks Breakthrough spill. That's shield-wall counterplay, kept deliberately ("if this gets too powerful, we can address later"). |
| **Scar** | This unit gets **+1 power for each damage marked on it, up to its remaining health** (bonus = min(damage, health − damage)). | Power derivation from `damage`, capped **[decision 70 — designer's "reading A" on #12]**: a 3-health unit with 2 damage gets +1, not +2. The wound powers you, never past what you could survive. **Designer-confirmed as Overextend's successor** (red's identity). |

## 3. Effect-vocabulary deltas
- Remove: `imprison`, `release` (reserved), `imprisonWatcher` static.
- Add: `capture` (op/trigger bookkeeping), shield-token grant, `pips` card field, per-card Sneak
  ability payloads (reuse the existing op vocabulary as the ability body).
- `thresholdMod`/`oppThreshold` unaffected. Auto-target defaults (decision 51) carry over to any
  capture/sneak auto-picks.
- **Modal actions** ("choose one —"): the mode is declared at cast time alongside targets
  (decision-24-compatible — no mid-resolution pause). First customer: Griff's Reckless Charge
  rework (PR #13, held for this).
- **Count-based pump op**: +N per unit matching a predicate (color/side/zone) — PR #13 needs
  "+1 attack per other red unit in the same zone, either side's".
- **Linked-amount ops** ("X = the amount just healed/removed/dealt"): first customer is the
  designer's Blood Rush rewrite (issue #4) — "remove all damage from a unit you control, deal
  that much to your Home". Current ops take fixed `n` only.
- **Conditional amounts** (target-state predicates): "2 damage to a unit, or 3 if it's already
  damaged" — the designer's Devastating Strike rework (issue #4). Wants a `bonus-if` clause
  (predicate: damaged/exhausted/keyword) rather than a full modal.
- **Target-spec extensions**: `upTo` (optional targets — choose 0..count) and `sameZone`
  (all chosen targets share one zone) — the designer's Volcanic Slam rework (issue #4):
  "3 damage to up to 2 units in the same zone". Today `count` means exactly-N, zones unlinked.
- **`attachOrphan` turn action** (upgrades, §1.5) — attach an orphaned upgrade to your unit in
  its zone at full cost+pips.
- **`double` over a UnitFilter + multi-round durations** (`dur: {rounds: N}`): the designer's
  Unchained Rage rework (issue #4) — "double all your units' attacks for the next 2 rounds".
  Today `double` is single-target and durations are round/perm only.
- **[RESOLVED — decision 70]** Scar's bonus caps at remaining health ("reading A", #12).
  Overextend stays cut. Folded into the keyword table above.

## 4. Migration sketch (for the build plan)
1. Decisions 59–62 cut (done, 2026-07-10) → finalize this file → rename over `game-rules.md`
   as **v3.0**; v2.3 stays selectable as a rules version for A/B.
2. Engine order: pips (isolated, big test surface) → keyword suite (mostly local mechanics) →
   combat rework last (touches everything; reuse the paired-action event pattern from intercept).
3. Full card re-churn against the v3 keyword set (red→Scar, yellow→Capture/Shielded,
   purple→Hidden/Infiltrate/Sneak if adopted), then canon-v2.0.

## 5. Undo at a public table *(decision 82 — issue #24 Q11, designer, 2026-07-12)*
The v2.3 spec's free undo remains the law for private/friendly tables. On **public multiplayer
tables**: each player gets **one free undo per round**; any further undo that round requires
the **opponent's approval**. Implementation lands with the multiplayer v3 port (issue #23) —
per-round undo counting plus a consent message over the wire.

## 6. Pip presence reads the whole bank *(decision 81 — issue #24 Q10, designer, 2026-07-12)*
A banked card provides its colors **whether ready or spent** — presence is citizenship, not
upkeep. Closes the open question carried from issue #21.

## Open questions index
**All answered (2026-07-10, [issue #9](https://github.com/booherbg/2026-card-game/issues/9)):**
Q1–Q6 midday, Q7–Q10 evening — folded in above (decisions 59–62). The lone remaining echo:
**blocking exhausts the blocker** is *derived* from Q10, not stated by the designer — flagged
on the issue; a veto flips 1.3.2 and makes Guard need a different perk.
**Second court (2026-07-12, [issue #24](https://github.com/booherbg/2026-card-game/issues/24)):**
all eleven questions answered — decisions 73–82, folded in above. One rule stands accused
awaiting verdict: the inherited **upgrade-pressure tax** (cut or keep-and-teach).
