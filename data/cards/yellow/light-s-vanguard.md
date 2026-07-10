---
name: Light's Vanguard
type: unit
cost: 8
power: 6
health: 8
keywords: flying, guard
influenceTrigger: onDefend
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDefend":[{"op":"influence","n":2}]}
---
Flying, Guard. When this defends, gain 2 Influence.

## Design notes

⚑ Flying is undefined in rules v1.2 — implemented as "may move to any zone, ignoring adjacency". Needs design.
