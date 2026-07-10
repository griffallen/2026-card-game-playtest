---
name: Bulwark Protector
type: unit
cost: 3
power: 2
health: 5
keywords: guard
influenceTrigger: onDefend
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDefend":[{"op":"influence","n":1}]}
---
Guard. When this defends, gain 1 Influence.

## Design notes

Decision 34: influence is earned by events, never by existing — this unit pays out when it defends (is attacked).
