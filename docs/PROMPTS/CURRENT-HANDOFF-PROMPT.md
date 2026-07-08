# Current Hand-off

**Phase:** Implement — turn-structure v2.0 (decisions 40–44), handing off to a fresh session (likely
Opus) for execution.

## Do this

Execute `docs/superpowers/plans/2026-07-08-turn-structure-v2.md` task-by-task (its header mandates
superpowers:executing-plans or subagent-driven-development). Nine tasks, TDD throughout, suite green at
the end of every task. Engine tasks 1–6 are fully code-specified; UI tasks 7–8 are behavioral
contracts — read `apps/demo/src/DemoTable.tsx` / `apps/web/src/pages/GameTable.tsx` before editing.
Task 9 rewrites GAME-FLOW.md, updates the verify scripts, and records before/after sim baselines
(pre-change: heuristic mirror red ~30%, influence wins 3/60 — expect shifts: both players now draw every
round, and guard walls no longer auto-block).

## Read first

`docs/SPECS/game-rules.md` (v2.0-proto — the contract) → the plan → `docs/DESIGN/DECISIONS.md` 40–44.

## What changed this session (003)

Shared rounds with claimable initiative replace per-player turns; summoning sickness removed (Rush =
exhaust-free entry-round move, toggleable attack coverage); multi-unit attack + defender intercept
window (Guard = intercepts without exhausting, forced targeting gone); Final Onslaught = ready one unit
+ extra action; no round-1 draw asymmetry. Spec bumped to v2.0-proto. Demo redeployed with a
designer-facing audit card — the live demo still runs v1.2 rules until the plan lands.

## State

- Spec + plan + decisions committed. 71 tests green on the *old* rules — they will churn; each plan
  task updates its own.
- **Live demo:** https://blainebooher.com/new-game-demo/ (v1.2 rules; audit card explains v2.0 is coming).
  Redeploy: `./scripts/deploy-demo.sh`.
- **Multiplayer app:** built; fly.io CI/CD armed but gated (`DEPLOY_ENABLED=false`; steps in README-DEPLOY.md).
- **Card database:** `data/cards.csv` + `scripts/cards-import.ts` (plan Task 4 migrates its vocabulary).

## Open questions

Designer (carried): base/home rename (Banner/Hearth/Seat/Beacon), prison's fate, mulligan feel,
influence threshold, his CSV card pass. New: granted-Rush-on-veterans under the strict decision-41
reading (plan Task 2 pins the boundary in a test — flag if playtests complain).

## After implementation

Playtest the feel of claiming initiative and intercepts, rerun sims (compare against the baselines
above), then it's the designer's turn in the chair.
