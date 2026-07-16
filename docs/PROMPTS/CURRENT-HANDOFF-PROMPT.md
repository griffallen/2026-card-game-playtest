# Current hand-off (session 013 wrap, 2026-07-16)

**Phase:** Playtest & iterate (v3 duel-law canon). The **balance pass (#104/#105/#107) is the live
work.** **Next in the chair:** likely **Griff** (rule High Justiciar on #107; generate art from the
#103 prompt library) or **Blaine** (build-now/queued process #109; PR-tweak the glossary #110).
Model routing per **CLAUDE.md → Model routing**: Opus routes/ticks/codes/deploys; **Fable drafts
every Griff/Blaine-facing comment** (re-check the thread as a separate step before posting).

## ⚠️ Two things that will bite if missed

1. **Phase 2 Group A is BUILT + tested (288 engine green) but UNCOMMITTED in the working tree** —
   held on a design call. It's the influence-trigger cards (Flameblade, Burning Oath, Exemplar,
   High Justiciar) + one new engine primitive (`ifKilled` on the influence op). **Do NOT `git add
   -A`** — you'd sweep it in unintentionally. Commit it *by path* once Griff rules on High
   Justiciar (below). If Griff wants High Justiciar changed, edit it first, then commit Group A.

2. **The demo is committed-current but NOT deployed, on purpose.** Phase 1 of the balance pass is
   committed (`a660cca`) but sits at a lopsided 66/34 red/yellow floor (numbers only, no yellow
   abilities yet). I publicly committed on #107 to **hold the deploy until the balance pass is
   coherent** (Phase 2 done). So the live demo is at v0.5.0; **Chronicle entry XII is committed to
   `Journal.tsx` but won't be live until the next deploy** (which ships with the finished pass).
   Don't deploy a mid-pass intermediate.

## The balance pass — where it stands (#104 yellow · #107 red · #105 Rush, all `major`)

Design is **fully locked** (all rulings in `SESSION-SUMMARIES/013.md` + on #107). Building in phases:

- **Phase 1 (numbers): DONE** — committed `a660cca`, pushed. Stat/cost/deletion across both colors,
  Doombringer deleted (Crimson Assault 65→64). Re-sim red 66 / yellow 34 (the numbers-only floor).
- **Phase 2 Group A (influence triggers): BUILT, HELD** — see ⚠️ #1. **The one open call:** on #107
  I flagged that High Justiciar's ruled on-defend→on-kill influence switch is a hidden nerf (1-Power
  Guard rarely kills). Options given Griff: on-defend 2 (its old reliable self) / on-defend 1 (trim)
  / on-kill (leave as built). **Wire his answer, commit Group A.**
- **Phase 2 remaining groups** (not started): conditional auras (Bloodfrenzy re-checks live,
  Dawnspear per-attacker buff), AoE/zone (Crimson Behemoth friendly-fire AoE + own-kill influence,
  Final Onslaught sacrifice + zone blast hits own, Censer damage-move), **Warpath** (half-X Power /
  full-X Life), **Worldrender** (shield/armor-pierce) + the **Rush rework** (static free-move/round —
  keyword change, touches engine + glossary + cards), **Last Stand** (mass-ready, per-action costs),
  and the rest of yellow (Inquisitor flexible capture, Custodian text-trim).
- **Then:** re-sim (coarse only — see below) → deploy → **full cross-surface audit** (rulebook,
  demo, every card) → close #104/#105/#107 `shipped`.

**Griff's standing note (#107):** the heuristic bots are too weak to grade fine balance — treat
sims as a **coarse regression-catcher**, weight design judgment + real games (#98 corpus, #97).

## Other open threads

- **#103 art** — full 120-card prompt library delivered (purple/red/yellow). Ball's on Griff to
  generate; when sheets land, chop/crop/file to `apps/web/public/cards/<slug>.jpg` (demo reuses web's public dir).
- **#99 — research report commissioned for SATURDAY AM (2026-07-18, midnight → 5pm reset).** Laptop
  on, Blaine out of town. Emergence/Wolfram-inverse-problem, color-qualia, the partnership. A *real*
  report (needs web access). Memory: `friday-research-report.md` (corrected to Saturday).
- **#110 glossary** — first pass committed (`fafdea2`), closed; Blaine will PR-tweak the markdown +
  port to demo tooltips when ready. Open judgment calls: "Shielded" vs "Shield"; the −15/±20 fix.
- **#109 docs lane** (backlog) — formalize doc-sync vs doc-as-design + "push source to origin" +
  "tag every incoming item, on its own thread" into `build-workflow.md`. Blaine fires.
- **#97 AI** (backlog) — the v1 roadmap is posted; collect ~5 games in **#98** (currently 2), then
  the branch-point analysis. #98 corpus grows via Copy Chronicle pastes.
- **#5** purple Veiled Court (backlog design); **#92** build-eng (fable=xhigh, canon).

## Read first

`SESSION-SUMMARIES/013.md` → **#107** (the whole balance pass + rulings) → #106/#110 (docs/glossary)
→ memory (esp. `engine-is-rules-source-of-truth`, `deploy-does-not-push-source`,
`friday-research-report`). Then: rule/commit High Justiciar, continue Phase 2 group by group.
