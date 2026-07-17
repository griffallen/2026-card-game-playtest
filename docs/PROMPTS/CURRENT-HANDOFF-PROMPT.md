# Current hand-off (mid-session refresh, 2026-07-17 — card pass COMPLETE)

**Phase:** Playtest & iterate (v3 duel-law canon). The **balance pass (#104/#107) is DONE at the
card level** — every card is built, tested (351 engine green), committed, and DEPLOYED live. The
only balance work left is the **Rush rework (#105)**, its own pass. **Next in the chair:** likely
**Griff** (playtest the live pass; react to the built-with flags; lock Rush's keyword design) or
**Blaine**. Model routing per **CLAUDE.md → Model routing**: Opus routes/ticks/codes/deploys;
**Fable drafts every Griff/Blaine-facing comment** (re-check the thread as a separate step before
posting). *State-only refresh mid-loop; a full wrap (session summary + Chronicle entry) has NOT run.*

## What shipped this session (all committed + pushed + DEPLOYED — demo is LIVE and current)

The **whole spec'd balance pass**, the **card-frame rework**, a **crash fix**, and **18 card
illustrations**. Git log is the record (`6f56d70` → the latest art commits). The **#107 milestone
digest + the "final three" reply** are the comprehensive public state — read #107 first.

- **Red:** Flameblade Raider, Burning Oath, Bloodfrenzy, Crimson Behemoth (zone AoE + collateral
  influence, both reads confirmed), Final Onslaught, Warpath (half-X Power/full-X Life),
  **Worldrender** (Rush + pierces Shield/Armor), **Last Stand** (mass-ready + no-exhaust pact +
  per-action tolls + end-round 7/7).
- **Yellow:** High Justiciar (on-kill +2), Exemplar Knight (on-kill +1), Dawnspear Paladin
  (per-attacker brace), Custodian of Law (→ "Guard."), Censer of Purity (activated Draw Wounds),
  **Inquisitor** (OR-capture: enemy w/ Power OR Cost OR remaining Health ≤ 4).
- **Demo:** card-frame rework (#103 — wrap titles, faction tint, fit-content box, art fills panel)
  + the white-band fix; **#111 crash fix** (saved decks strip cards deleted by a later pass —
  Doombringer no longer crashes "The Machine").
- **Art (#103):** Griff generated 3 sheets; all 18 yellow cards chopped/cropped/filed/live
  (chain-of-law … containment-priest). The **crop tool**: `magick sheet.png -crop 3x2@ -shave 10x10
  +repage -quality 88 out_%d.jpg`; row-major maps to Griff's listed order; auth-download a GitHub
  attachment with `curl -sL -H "Authorization: token $(gh auth token)" -o f.png <url>`.
- **Engine primitives added** (all test-first): influence onKill/onDeath+ifKilled; conditional
  attached auras; damageFilter creditsKills; per-attacker buff + PerCount influence/half; cond on
  damage; Censer's activate.amount + moveDamage; Worldrender piercesArmorShield; Last Stand's
  round-scoped no-exhaust pact (state.lastStands) + lastStand op; Inquisitor's anyOf TargetSpec.

## Open — awaiting Griff (nothing waits on me)

1. **Built-with flags he may react to** (all one-line reverts): **Last Stand's no-exhaust covers
   activated abilities** (Sneak/Ranged/Censer), so a multicolor deck gets toll-free repeatable
   activates — flagged on #107; **Worldrender's mixed-gang pierce** is an approximation (exact when
   alone); Censer's old start-of-round effect removed; Warpath ±1 floors to +0 while still charging.
2. **Rush rework (#105)** — its own build once Griff locks the keyword design (cross-cutting: engine
   + glossary + every Rush card; Worldrender currently carries *current* Rush).
3. **#111** — Griff may refill "The Machine" (2 Doombringers dropped). **#103** — re-crop any art he
   finds off-center (ten-second fix; tool above).

## Deferred

- **Full cross-surface audit** (rulebook / demo help / keyword gloss vs all the new mechanics —
  esp. Last Stand's no-exhaust pact, Worldrender pierce, Censer's activated ability) — the card
  portion is done, so this is now due before calling Phase 2 fully closed. Politician already
  verified taught (`rules-v1.3.md:156`).
- **#98 AI corpus** (3 games; grow to ~5, then #97 analysis). **#99 research report — SATURDAY
  2026-07-18** (midnight→5pm; laptop on, Blaine away; emergence/Wolfram, color-qualia, partnership;
  memory `friday-research-report.md`).

## Read first

**#107** (milestone digest + "final three" reply) → the git log → #103 (art) / #111 (crash) →
memory. Then: react to Griff's flags, run the cross-surface audit, and take Rush (#105) as its own
design→build pass when he locks the keyword.
