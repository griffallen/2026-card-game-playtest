# Releases

One line per build, newest first. Versioning `v0.MINOR.PATCH`, keyed to the build tier: a
**patch** bumps the patch digit, a **minor** batch bumps the minor digit; while pre-1.0 a
**major** (a mechanic/rules change) also bumps minor — **v1.0.0 is reserved for launch**. Each
line names the tier, the issues/PRs, decision numbers, sim numbers, and the commit.
See [`docs/AGENT/build-workflow.md`](docs/AGENT/build-workflow.md).

Release tracking began 2026-07-15 (#92); earlier demo builds predate the ledger.

## v0.1.2 — 2026-07-15
patch — demo decks (#94, Griff). Griff's own hand-curated lists are now the canonical
prebuilt decks: **Crimson Assault** = his 65-card red (was `griffs-red`), **Radiant Order** =
his 52-card yellow (was `griffs-yellow`). The stock auto-derived decks (every card in the
color, workhorses doubled) are deleted and the `griffs-*` slugs retired — sims now grade the
real decks under their names (crimson-assault vs radiant-order: red 43.5% / yellow 56.5%,
N=200). Roster is now 3 decks (+ Veiled Court). 271 tests green.

## v0.1.1 — 2026-07-15
patch — modal button help text (#93, Griff playtest). Binding Light (Weak / Cheap /
Overwhelm) and Containment Priest (Capture / Stand down) gained per-mode `text`, so the
demo's mode buttons now teach what each choice does — hover tooltip **and** the inline list,
matching Reckless Charge. The UI already rendered mode text; these two cards just had none.
Card data only; 271 tests green.

## v0.1.0 — 2026-07-15
Baseline. The yellow nerf pass — griffs-yellow **69.7% → 56.0%** vs griffs-red (N=300) —
plus the ±20 influence win band (decision 106, #91), divide-retaliation (decision 105, #84),
the yellow card folds (#85 Aura of Resolve, #88 Devout Intervention, #89 Radiant Judgment),
and the catalog `code:` field (#83). Shipped #81 #83 #84 #85 #88 #89 #91. commit `11cf1d6`,
271 tests green.
