---
name: Radiant Judgment
type: action
cost: 5
influenceTrigger: onPlay
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"exhaust","t":{"side":"enemy","maxPower":3}},{"op":"influence","n":2}]}
---
Exhaust every enemy unit with 3 or less Power. Gain 2 Influence.

## Design notes

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Mass judgment: the small are stilled everywhere.
