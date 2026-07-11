# v3.0 Consistency Sweep — spec ↔ engine ↔ cards ↔ demo

**Date:** 2026-07-11 · **Requested in:** issue #23 (second half) · **Method:** fresh-context
audit of the full canon chain — `docs/SPECS/game-rules.md` (v3.0) → `packages/engine` →
120-card set → demo UI/rulebook — with empirical engine probes, the full test suite
(152/152 green), and `sim-v3-check.ts heuristic` (60/60 clean, matching the decision-71
ledger numbers).

Summary posted to issue #23; this file is the complete findings archive.

---

## 1. Turn/round structure — CONSISTENT (engine ↔ spec ↔ rulebook)

- Setup (bank 2 chosen, unlimited decrement mulligans w/ floor = bank size, london A/B): `engine.ts:51-112`, `legal.ts:16-49` ✓ spec v2.3 §1.3, decisions 31/32/58.
- Decision 71: `round.ts:51-57` skips ready/draw/bank when `round===1 && !firstRoundStartStep`; `V3_RULES.firstRoundStartStep=false` (`rules.ts:43`). Verified empirically: v3 game opens in `phase:'loop'`, round 1. v2.3 keeps the start step ✓ (`round1-v3.test.ts`, both branches). Rulebook has a dedicated "Round 1 has no start step" callout ✓.
- Start step order (decay → startOfRound → ready → draw 2 → bank ≤1), soft passes, claim-once, claim-then-solo-pass ends round: `round.ts:7-83`, `engine.ts:146-165` ✓ spec §1.4/§1.5.
- **DRIFT (major, player-facing):** the in-game help of the **v3 demo** (`apps/web/src/components/HelpPanel.tsx:33`, rendered by `apps/demo/src/DemoTable.tsx:818`) teaches "Start of round: both players ready, draw 2, bank" with **no round-1 exception**, plus the whole panel is v2.3 (see §8).

## 2. Combat (v3 blocker-paired) — ENGINE↔SPEC CONSISTENT; three drifts at the card/trigger layer

Engine `engine.ts:397-590` matches spec §1.3 on: declare+exhaust, target-may-self-block, blocking exhausts non-Guards (`engine.ts:514`, knob `blockingExhausts`), Guard blocks free, gang-block pour order = pair order (`engine.ts:550-560`), simultaneous snapshot resolution, blockers' combined counter, unblocked full damage to declared target, no strike-back without blocking, Breakthrough spill **to the original target** (`engine.ts:559`, incl. base), cross-zone Ranged = no block window/no retaliation (`engine.ts:458`), same-zone ranged blocks normally. Covered by `combat-v3.test.ts` (5 tests).

- **DRIFT (major): `onKill` never fires when an attacker kills its blocker.** `engine.ts:522-590` — the only onKill fire is when the *declared target* dies (`:579-583`). Empirically confirmed: 5-power attacker kills its blocker → influence unchanged. Contradicts printed text on **8 cards** ("When this/it defeats a unit, gain N Influence": exemplar-knight, noble-purifier, whisper-blade, mist-stalker, veil-assassin, assassin-s-contract, nocturne-sniper, the-unseen-court) and the Veiled Court deck blurb ("profits from every named kill", `decks.ts:56`). Blockers killing attackers also never trigger their own onKill. Purple's identity leans on this trigger; under v3 it silently pays only on unblocked kills.
- **DRIFT (minor): blocked attackers get onKill credit they didn't earn.** Empirically confirmed: attacker A fully blocked by a wall, co-attacker B kills the target → A's onKill fires (`engine.ts:580-582` loops all plans). Matches the v2.3 §1.7.4 "all participants" reading, but under pairing semantics A never touched the target. Spec v3 silent.
- **DRIFT (minor): armor vs multiple unblocked attackers.** Engine lumps unblocked damage + spill into ONE hit — armor applies once to the total (`engine.ts:570-578` → `damageUnit`). Confirmed: 2+2 power unblocked vs Armor 2 → 2 damage (per-blow would be 0). Rulebook keyword table says "combat resolves in separate pairings, so N comes off each attacker's blow individually" (`Rules.tsx` Armor row) — true for pairings, silently false for the unblocked lump. Spec silent.
- **DRIFT (minor): Ranged vs bases.** Engine: ranged units can **never** attack bases (`engine.ts:423`, `legal.ts:200`, inherited decision 22). v3 rulebook Ranged row: "Bases are safe from afar — reaching one still means standing in the enemy's Home" — implies a ranged unit standing in the enemy Home *can* hit the base. v3 spec §2 "changed: ranged" doesn't restate the base ban. Spec gap + rulebook wording that teaches the wrong rule.
- UNVERIFIED (design edges, spec silent, engine behavior noted): (a) a **Shielded blocker** soaks its attacker's full pour chunk (`remaining health + armor` worth) while taking zero damage — reduces Breakthrough spill (`engine.ts:552-559` + `effects.ts:79-83`); (b) `onAttackBase` does **not** fire for breakthrough spill reaching the base, only for unblocked attackers (`engine.ts:574-576`).

## 3. Pips & resources (decision 69) — CONSISTENT

- `helpers.ts:228-240`: presence model — counts providing cards over the **whole bank, ready OR exhausted** (no exhausted filter), per-card `.includes(color)` so same-color pips never stack and multi-color cards provide each color; pips never exhaust; payment color-blind (`engine.ts:238-242`). 0-cost cards still gated (`engine.ts:298` before `payCost`); salvage gated too (`engine.ts:227`). `pips.test.ts` covers all of it including the v2.3-ignores-pips branch.
- Card data: all 120 cards have mono-color pips matching their color; grammar (≤2→1, 3–6→2, 7+→3) holds with exactly the 4 designer-approved tax-harder deviations (warcry-leader, wither, veilmaster, gateward-colossus). One 0-cost card (reckless-charge, 1 red pip — the exact decision-69 case). Rulebook pips section is a faithful restatement.
- **Polish:** `docs/DESIGN/06-PIP-PROPOSAL.md` lists Reckless Charge at cost 1; card is cost 0 (designer-signed on PR #13/#14 per the ledger note). One stale row in the approved-baseline doc.

## 4. Keywords — engine ✓ spec; drift in cards and UI

| Keyword | Spec↔engine | Notes |
|---|---|---|
| Hidden | ✓ | Ready-only targeting/attack immunity (`engine.ts:288,429`, `legal.ts:194,303,131`); can block; exhaust reveals. **UNVERIFIED design gap:** auto-picks ignore Hidden — fiery-impaler's "strongest other enemy unit" splash (`effects.ts:33-37,67-73`) can hit a ready Hidden unit; spec's "can't be targeted by enemy actions" doesn't say whether decision-51 auto-picks count. |
| Infiltrate | ✓ | `engine.ts:334-339`, `legal.ts:105-108`. |
| Sneak (d.60) | ✓ engine | `engine.ts:181-200`: ready-only, exhausts (=reveals), same-zone, base only from enemy Home. **DRIFT (blocker for the demo, see §8): no human UI** — zero `activate` affordances in DemoTable or GameTable. |
| Capture (d.61) | **DRIFT (major)** | Spec §2 + rulebook: hold cost = "the capturer stays exhausted = can't attack, and can't block"; captive returns "when the capturer leaves play — or when the capturer readies", release = declining at the ready step. Engine: **capture never exhausts the capturer** (`effects.ts:334-346`) — empirically confirmed a fresh Containment Priest is ready, attacked, and kept its captive; release is a **loop action costing a turn** (`engine.ts:169,203-217`); the `ready` op readies a capturer **without freeing the captive** (confirmed; `effects.ts:306-315` vs `round.ts:34-38` which only guards the start step). Three contradictions with spec §2 and the rulebook's Capture row. Captive-returns-exhausted ✓ (d.61). |
| Shielded | ✓ engine | `effects.ts:79-83`, one event = whole hit. **DRIFT (minor, view):** `view.ts:12-16` derives keywords from the card def — a Shielded unit still displays "shielded" after the token is spent; `UnitView` doesn't expose `unit.shielded`. |
| Scar (d.70) | ✓ | `helpers.ts:108-111`: `min(damage, remaining)`, capped ≥0. |
| Rush | ✓ | First-move-only waiver (`engine.ts:373`), d.41-clarified. |
| Breakthrough | **DRIFT (major)** | v3 spec §2: "loses N; pushes all excess". Engine v3 correctly ignores N (`engine.ts:559`, boolean `hasKw`). But **10 cards still print and carry N** (flameblade-raider 1, rageforged-brute 2, blaze-juggernaut 2, doombringer 3, inferno-titan 3, earthshaker 3, apocalypse-engine 4, worldrender 5, + grants on smash-through 2 / cataclysmic-charge 3). Under the deployed v3 default, "Breakthrough 2" spills 5 if there are 5 — the printed cap is a lie; the numbers are only live under v2.3 A/B. |
| Guard | ✓ engine (blocks free, `engine.ts:514`) | v2.3 gloss/HelpPanel still say "intercepts" (§8). |
| armor/cantAttack/ranged | ✓ | Kept-as-is per spec. |

## 5. Win conditions — CONSISTENT

Life→influence order, checked after every atomic change (`effects.ts:380-396`, `helpers.ts:181-203`); simultaneous-life tiebreak `actor` ✓ decision 17 (`'draw'` falls back to actor — already documented as open in v2.3 spec §6); influence clamps at threshold with oppThreshold statics (`helpers.ts:27-32,149-158`); concede legal any time (`engine.ts:25-30`); empty-draw −1 life/−1 influence per missing card (`helpers.ts:165-178`) ✓ decision 33 ✓ both rulebooks.

## 6. Upgrades — engine ✓ decision 67; UI can't reach it

- Orphaning + salvage at full cost **and** pips, same-zone, either player: `effects.ts:364-372`, `engine.ts:219-234`, `legal.ts:140-148` ✓ spec §1.5, tested.
- Upgrade pressure (beyond-first → opponent +1): `engine.ts:311-315` ✓ v2.3 §1.6.4. **Minor:** `attachOrphan` does **not** apply upgrade pressure — salvaging a second upgrade onto a unit dodges the influence tax (spec silent; pick one). **Minor:** salvage doesn't re-run `onPlay` — an orphaned Iron Discipline ("...Gain 1 Influence") salvaged at full cost pays no influence; spec says only "cost check identical", card text implies otherwise.
- **DRIFT (major, demo-matches-canon):** orphaned upgrades are **invisible and unsalvageable in every UI** — `PlayerView` (`view.ts`/`types.ts:290-308`) has no orphaned-upgrades (or captives) field, and neither DemoTable nor GameTable emits `attachOrphan`. In a v3 demo game, a dead wearer's upgrades silently vanish from the player's world while remaining in engine state. Same for captives (a captured unit just disappears; `releaseCaptive` unreachable).
- **Polish:** neither rulebook mentions the upgrade-pressure rule at all.

## 7. The 120 cards — clean except three findings

`npm run cards:check` ✓ (120 valid, generated current). No card carries or grants overextend/flying/reach/untargetable; no imprison ops, no imprisonWatcher, no prison/intercept text (regex sweep). Costs/pips match the approved baseline (one signed exception, §3). Numeric text-vs-ops audit (damage/influence/draw/heal/targets across all 120) — clean. Modal/linked/conditional/upTo-sameZone/countBuff vocabulary spot-checks (reckless-charge, blood-rush, devastating-strike, volcanic-slam, unchained-rage, final-onslaught) all match spec §3.

- **DRIFT (major): `data/cards/purple/dream-thief.md`** — body text is stale v2.3: "**Flying.** When this enters play, draw a card." while frontmatter/effects are v3: `hidden, sneak` + Sneak payload "gain 2 Influence". Printed text names a removed keyword and omits both real keywords and the whole Sneak ability.
- **DRIFT (major):** the 10 "Breakthrough N" texts (§4).
- **DRIFT (minor):** Radiant Order prebuilt deck description still says "**imprison** the threats" (`decks.ts:44`) — prison is cut; yellow captures now.

## 8. Dead v2.3 paths under the v3 config — engine sealed; the shared UI is the leak

Engine: `intercept` phase unreachable under `combatModel:'blockerPairing'` (branch at `engine.ts:455`; `legal.ts` never emits intercept/overextend under v3); prison ops/decay/release, flying, reach, untargetable all unreachable because no card carries them (latent code only). One latent wart: `attackDeclare` would still accept an `overextend` declaration under v3 (self-damage with **no** power bonus, since `resolveBlockedAttack` never adds it) if a future card ever carries the keyword — polish.

The reachable dead paths are player-facing, all shipped inside the v3 demo:

- **DRIFT (major): `apps/web/src/components/HelpPanel.tsx`** — the demo table's "?" help (used at `DemoTable.tsx:818` under v3 default) teaches the intercept window, Overextend as a live mechanic, "Breakthrough N spills up to N", Guard-as-interceptor, Reach, the entire prison economy ("every prisoner costs you 1 influence per round"), and every-round banking — none of which exist in the v3 game the player is looking at, and prison/overextend don't exist in **any** current game (no card in the 120 has them). It also directly contradicts the Rules.tsx rulebook one tab over.
- **DRIFT (major): `apps/web/src/game/gloss.ts`** — `KEYWORD_GLOSS` has **no entries for scar, shielded, hidden, infiltrate, capture, sneak** (inspectors render an empty gloss via `Sheets.tsx:56,124`), and its guard/ranged/breakthrough/overextend lines are v2.3 semantics. Affects both demo and web tables.
- **DRIFT (blocker for "demo matches canon"): missing v3 action affordances.** DemoTable handles play/move/attack/block/intercept/resource/mulligan/setupBank/claim/pass/concede only — **no `activate` (Sneak), no `releaseCaptive`, no `attachOrphan`.** A human in the v3 demo cannot use three purple Sneak cards, can never release a captive, and can never salvage — even though the rulebook explicitly lists "Use a Sneak ability" and "Salvage an orphaned upgrade" as turns. (The AI opponent *can* take these actions via `getLegalActions`, so the human plays against moves they can't make or even see — captives/orphans aren't rendered.) `apps/web` GameTable additionally has **no block UI at all** — fine under its seeded v2.3 default, breaks the moment an admin flips the default rules row to v3.
- Rulebook (Rules.tsx) turn list omits "release a captive" as an action — consistent with the spec's ready-step model but not with the engine's action model (see Capture drift, §4).

## 9. Determinism — CONSISTENT

Engine src has zero `Math.random`/`Date` usage (only hit: `keywords-v3.test.ts:61`, `Math.random() * 0 + 7000` — constant, harmless). All randomness through mulberry32 threaded as explicit `rngState` (`rng.ts`, `setup.ts`, mulligan reshuffle `engine.ts:63`); AI policies take an rng-state parameter derived from the game seed (`ai.ts`, `simulate.ts`); iteration is id-sorted (`helpers.ts:35-39`); reducer is `structuredClone`-pure.

## Test & sim results

- **Engine suite** (`packages/engine`, vitest): **20 files, 152/152 passed** (includes the 150-game random-playout harness, 60-game heuristic mirror, and both v3 sim suites). Heuristic mirror in-suite: red 32/60 (53%), median 10 rounds. (Server integration tests not run — they require the dedicated test DB.)
- **`npx tsx scripts/sim-v3-check.ts heuristic`:** `60/60 clean · Crimson Assault 29 — 31 Radiant Order · influence wins 23 · median-ish rounds 11.2` — matches the decision-71 ledger numbers.

## Overall verdict

**Spec ↔ engine ↔ card structure ↔ rulebook page are tightly consistent on turn structure, pips, win conditions, upgrades, and the combat skeleton; the drift is concentrated in (1) Capture's missing exhaust cost (engine contradicts both spec §2 and the rulebook), (2) onKill never paying for blocker kills (contradicts 8 cards' printed text), (3) "Breakthrough N" surviving on 10 cards a spec that deleted the N, (4) one stale card text (dream-thief), and (5) the v3 demo shipping a v2.3 help panel/keyword gloss and no UI for Sneak/release/salvage — so the demo currently cannot deliver three canon mechanics to a human player.**
