---
name: Radiant Judgment
type: action
cost: 5
influenceTrigger: onPlay
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"influence","n":1},{"op":"exhaust","t":{"side":"enemy","maxCostInfluence":true}},{"op":"influence","n":1,"cond":{"influenceAtMost":0},"per":{"count":"units","f":{"side":"enemy","zone":"controllerHome"}}}]}
---
Gain 1 Hope. Then exhaust every enemy unit whose cost is no more than your current Hope. If your Hope is below 1, gain 1 Hope for each enemy unit in your Home zone.

## Design notes

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Mass judgment: the small are stilled everywhere.

2026-07-15 (#89, Griff ratified): the flat "≤3 Power, +2 Influence" becomes a scaling verdict. The +1 lands FIRST, then the exhaust reads your *new* Influence as a live cost cap — at 3 Influence you gain 1 to reach 4 and still every enemy costing ≤4; the further ahead you are, the wider the judgment sweeps. The old flat +2 is gone; instead a catch-up clause: if you're still under 1 Influence after the gain, the verdict pays 1 per enemy standing in your Home — the deeper the invasion, the harder the comeback. Two new primitives: `maxCostInfluence` (an exhaust filter tied to the controller's live Influence) and a filter `zone: controllerHome` (the caster's own Home), feeding decision-103 per-op scaling on a `cond`-gated Influence gain.
