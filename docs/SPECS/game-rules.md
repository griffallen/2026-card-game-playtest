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
2. **Block — the duel law [decision 98 (issue #50, designer: "flip it") — supersedes the open
   window for lone attackers]:** if **exactly one unit attacks an enemy unit**, no ordinary
   unit may block — the block window opens only if the defender has a ready **Guard** in the
   zone, and then **at most one Guard** may step in front (full redirect: the Guard takes the
   entire hit and counters as a blocker; the target is untouched and does not retaliate).
   **[Decision 100 (issue #50, designer) — the Home is everyone's to defend:** the duel law
   governs **unit targets only**. A lone attacker declaring the **Home** faces the fully open
   block window — any ready unit may block (Guards still block without exhausting). Purple
   owns zero Guards; under an unqualified duel law it literally could not defend its base.
   Measured cost of the carve-out: prebuilt red 46.0% → 33.5%.]** If **two or more
   units attack**, the defense opens fully: the defender assigns any of their ready units in
   that zone as blockers, pairing them onto attackers — 1v1 or several blockers ganging one
   attacker; the declared target may itself block its attacker. **Blocking exhausts the
   blocker** (Guard excepted, see 1.3.6). In a gang block the defender's **pair order is the
   pour order** — the attacker's damage fills each blocker in sequence (deterministic split
   under the defender's control, decision Q5). *A/B verdict (400 games): red 28.5% → 36.3%,
   influence wins 49% → 40% — reliable removal without touching a red card.* *(Decision 80
   removed the cross-zone Ranged sniper shot — all v3 attacks happen within one zone.)*
3. **Resolve simultaneously, per pairing:** each attacker fights its blocker(s); **[Q5 ✓] in a
   gang-block the DEFENDER divides the attacker's damage** among the blockers; blockers' combined
   power hits the attacker back.
4. **[Q4 ✓] Unblocked attackers deal their full damage to the declared target** (unit or Home).
   **[Decision 84 (issues #25/#24, designer) — the attacked always fight back:** a unit that is
   the declared target strikes **every unblocked attacker** back at its full power, **exhausted
   or not**, simultaneously. Being attacked is never free for the attacker; exhaustion costs you
   the *choice* of defense (blocking for others), not self-defense. Bases never strike back.
   Being the declared target also fires "when this defends" triggers whether or not damage got
   through (decision 85) — but **only once**: a self-blocking target's blocker-fire is its
   target-fire (decision 86). Yellow's guard-payout ladder and wall statlines moved up a notch
   in the same ruling.]**
5. **[Q6 ✓] Breakthrough** (no number): excess damage from a killed blocker pushes through **to
   the original declared target**. No choices; fully deterministic. *(Decision 75: the eleven red
   cards that still printed "Breakthrough N" — eight carriers, three grants — shed their
   numbers; the printed cap was already dead under this rule.)*
   **[Decision 102 (issue #66, designer) — the siege clause:** a Breakthrough attacker fighting
   **in the opponent's Home** leaves no damage behind: excess past the declared **unit** target
   pours on into the **base**. The chain is blockers → declared target → Home. When breakthrough
   and plain damage arrive at the target together, the plain damage is absorbed first (it has
   nowhere else to go); a shield eats the whole combined hit, so a shielded target spills
   nothing. Outside the enemy Home, excess still stops at the declared target.]**
6. **[Decision 74 — "a kill is a kill" (issue #24 Q2, designer)]** "When this defeats a unit"
   triggers fire for the unit whose combat damage felled the victim, on either side of the
   pairing: an attacker credits each blocker it fells, blockers credit the attacker they fell,
   and the declared target's death credits **only the attackers whose damage actually reached
   it** (unblocked or spilling through) — an idle, fully-blocked attacker never collects on an
   ally's kill. Simultaneous trades credit both sides.
7. **[Decision 78 — base-trigger vocabulary (issue #24 Q7, designer)]** "When this **attacks**
   a base" fires only for a declared, unblocked attack reaching the base — Breakthrough spill
   is aftermath, not an attack. **[Decision 87]: the declaration counts** — it fires even when
   every point of damage is prevented ("it attacked the base, unsuccessfully"). A second
   trigger, "when this **damages** a base" (any base damage, spill included), is **reserved
   vocabulary**: the engine implements it with the first card that prints it — and it would
   NOT fire on a fully-prevented attack.
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
| **Capture** | On its trigger, this unit takes an enemy unit **under itself** (out of play, no zone presence). The captive returns **only when the capturer leaves play**, ready, to that zone. | Prison's successor. **[Decision 92 (issue #44, designer) — supersedes 73's release clause and the grip-lock]:** capturing costs nothing, holding costs nothing, and **there is no voluntary release** — the grip breaks only with the capturer's death (card effects like Absolution can still free). Future cards may print their own release abilities. Pinned by test. |
| **Infiltrate** | May be deployed to **any zone**, not just its owner's Home. | Clear; deploy-time zone choice in the play action. |
| **Shielded** | Enters play with a shield token; the first instance of damage it would take is prevented entirely and the token is removed. | Clear. "Instance" = one damage event (combat hit, one effect op). **[Decision 77 (issue #24 Q6, designer)]: as a blocker, the shield soaks the attacker's ENTIRE pour** — the wall absorbs the whole assigned chunk and shrinks Breakthrough spill. That's shield-wall counterplay, kept deliberately ("if this gets too powerful, we can address later"). |
| **Scar** | This unit gets **+1 power for each damage marked on it** — no cap. | Power derivation from `damage`, uncapped **[decision 94 (issue #49, designer) — supersedes 70's reading-A cap]**: a 3-health unit with 2 damage gets +2. Every wound is fuel; the closer to death, the harder it hits. **Designer-confirmed as Overextend's successor** (red's identity). |
| **Politician** | At the end of each round, if this unit stands in the **Neutral zone** and its owner has **more units there** than the opponent, its owner gains **1 Influence** — once per round, however many politicians. | **[Decision 88 (issue #29, designer)]** — the door-1 zone rule reborn as a keyword ("rather than a hard-coded rule, let's make it a keyword"). Color law: yellow/blue/purple identity; red gets few, if any. Assumptions logged for veto: Neutral-only (a home-zone politician earns nothing — majority at home is free), any-units majority (not ready-only), capped at 1/round. First carriers ⚑: Veiled Messenger, Hierophant. |

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
  "+1 attack per other red unit in the same zone, either side's". *(Power only, via `countBuff`.)*
- **[IMPLEMENTED — PR #70/#71, 2026-07-13] Count-scaled `per` modifier on `influence` and `heal`.**
  An optional `per` field multiplies the op's `n` by a live count:
  - `per: {count: 'attackers'}` — the number of units attacking the defending unit in the current
    combat. Only meaningful in `onDefend` (0 elsewhere). First customer: **Light's Vanguard** —
    "For each unit that attacks this unit, gain 1 Influence." A lone attacker pays 1; a gang pays
    its size.
  - `per: {count: 'units', f: UnitFilter}` — in-play units matching a filter (same `{side, zone}`
    shape the `exhaust`/`damageFilter` ops resolve; `zone: 'chosenZone'` needs a zone target).
    Readies **Prison of Light** (PR #71) — "+1 Influence per enemy exhausted, +1 Life per friendly
    in that zone" — as a card-only follow-up (no further engine work).
  - ⚑ **RATIFY (edge, decision 86):** a self-blocking declared target fires `onDefend` only once
    (as its own blocker), and in that single fire it counts **every** attacker facing it, not just
    the one it physically blocks — the faithful reading of "each unit that attacks this unit."
  - A `per` count of 0 is a silent no-op (no "gains 0" log line).
- **[IMPLEMENTED — decision 104, 2026-07-13] Life and influence are uncapped values.** No heal
  ceiling (overheal past starting life), no life floor at 0 (a base reads negative), no influence
  clamp to the ±threshold band. `checkWin` is unchanged: a base at ≤0 life loses; influence at a
  seat's threshold (incl. `oppThreshold` raises) wins. The validator's ±10 bound on the
  `oppThreshold` *card field* stays — a card-authoring guardrail, not a value clamp.
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
- **[RESOLVED — decision 94, superseding 70]** Scar's bonus is uncapped (+1 per damage marked; issue #49).
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
all eleven questions answered — decisions 73–82, folded in above — plus the accused rule's
verdict: the inherited **upgrade-pressure tax was cut** (decision 83, §1.5) and the retaliation
door became law with yellow's repair (decisions 84–85, §1.3.4).
