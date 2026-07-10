---
name: Light's Vanguard
type: unit
cost: 8
power: 6
health: 8
keywords: flying, guard
influenceTrigger: onDefend
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDefend":[{"op":"influence","n":2}]}
---
Flying, Guard. When this defends, gain 2 Influence.

## Design notes

Flying is canon (decision 48): may move to any zone, ignoring adjacency.
