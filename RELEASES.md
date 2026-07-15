# Releases

One line per build, newest first. Versioning `v0.MINOR.PATCH`: **major** = a mechanic or
rules change, **minor** = a nightly `queued` batch, **patch** = a self-contained quick fix.
See [`docs/AGENT/build-workflow.md`](docs/AGENT/build-workflow.md).

Release tracking began 2026-07-15 (#92); earlier demo builds predate the ledger.

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
