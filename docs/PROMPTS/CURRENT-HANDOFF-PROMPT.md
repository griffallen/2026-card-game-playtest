# Current hand-off (mid-session refresh, 2026-07-17)

**Phase:** Playtest & iterate (v3 duel-law canon). The **balance pass (#104 yellow · #107 red ·
#105 Rush) is the live work — and its spec'd cards are now ALL BUILT, committed, and DEPLOYED
live.** **Next in the chair:** likely **Griff** (test the new cards; answer the open specs below) or
**Blaine**. Model routing per **CLAUDE.md → Model routing**: Opus routes/ticks/codes/deploys;
**Fable drafts every Griff/Blaine-facing comment** (re-check the thread as a separate step before
posting). *This is a state-only refresh mid-loop; a full wrap (session summary + Chronicle entry)
has NOT run yet.*

## What shipped this session (all committed + pushed + deployed — demo is LIVE)

The entire spec'd Phase 2 of the balance pass, plus the card-frame rework. Git log is the record
(commits `6f56d70` → `d60c8f4`). The **#107 milestone digest** (issuecomment-4998205001) is the
comprehensive public state — **read it first.**

- **Red:** Flameblade Raider, Burning Oath (influence on death/kill), Bloodfrenzy (conditional
  aura), Crimson Behemoth (friendly-fire AoE + collateral influence), Final Onslaught (sacrifice +
  zone blast), Warpath (half-X Power / full-X Life, cost 0).
- **Yellow:** High Justiciar (**on-kill +2** — final, after a +1 detour Griff corrected), Exemplar
  Knight (on-kill +1), Dawnspear Paladin (per-attacker Power brace, this-round, before retaliation),
  Custodian of Law (trimmed to "Guard."), Censer of Purity (activated **Draw Wounds** ability).
- **Demo:** card-frame rework (#103 — wrap titles, faction-tint fit-content text box, art fills the
  panel) + the white-band fill fix. Deployed. Chronicle entry XII is now live (deployed with the pass).
- **New engine primitives** (all test-first, 327 engine tests green): influence onKill/onDeath +
  `ifKilled`; conditional attached auras (`cond` honored live); `damageFilter` `creditsKills`;
  per-attacker `buff` via `PerCount`; `PerCount {count:'influence',half?}`; `cond` on the `damage`
  op; and Censer's `activate.amount` channel + `CardDef.activated` + the `moveDamage` op.

## Open — awaiting Griff (nothing is waiting on me)

1. **#107 Crimson Behemoth — two reads to confirm** (built the defensible reading, flagged): AoE
   scope = **zone-only**; trigger = **any attack, fires at declaration**. A "no, base-only" is a
   one-line change.
2. **Two built-with notes** he may react to (both one-line reverts): Censer's old start-of-round
   influence-bleed was removed ("change text" read as wholesale replace); Warpath at Influence ±1
   pumps +0 but still charges (floor consequence).
3. **Three specs I need to finish Phase 2** (the only cards left): **Worldrender** (intent
   "shield/armor-pierce", no locked text), **Last Stand** (intent "mass-ready / per-action costs",
   no exact rules), **Inquisitor** ("flexible capture" ruling).
4. **Rush rework (#105)** — its own build after Griff confirms the keyword design (cross-cutting:
   engine + glossary + every Rush card). Deliberately held, not stalled.

## Deferred / other threads

- **Full cross-surface audit** (rulebook / demo help / keyword gloss vs all the new mechanics) —
  run it once the WHOLE pass lands (the remaining cards + Rush will move things again). Spot-checked
  already: **Politician** (Censer's keyword) is established + taught (`rules-v1.3.md:156`), no gap.
- **#98 AI corpus** — 3 games logged (Griff's Copy-Chronicle pastes carry the seed + full replay;
  the help text was corrected this session). Grow toward ~5, then the #97 branch-point analysis.
- **#99 research report — SATURDAY 2026-07-18** (midnight → 5pm reset). Laptop on, Blaine out of
  town. Emergence/Wolfram-inverse-problem, color-qualia, the partnership. Memory:
  `friday-research-report.md`.
- **#103 art** — 120-card prompt library delivered; ball on Griff to generate sheets.
- **#109** docs-lane formalization (Blaine fires); **#5** purple Veiled Court (backlog).

## Read first

**#107 milestone digest (issuecomment-4998205001)** → the git log `6f56d70..d60c8f4` → #104
(Dawnspear/Censer/Custodian rulings) → memory (`friday-research-report`,
`engine-is-rules-source-of-truth`, `deploy-does-not-push-source`). Then: answer Griff's open specs
and build the rest group by group; re-sim (coarse) as cards land; audit when the pass fully closes.
