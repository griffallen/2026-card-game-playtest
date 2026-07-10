---
name: Custodian of Law
type: unit
cost: 5
power: 4
health: 6
keywords: guard
influenceTrigger: onDefend
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDefend":[{"op":"influence","n":2}]}
---
Guard. When this defends, gain 2 Influence.

## Design notes

Decision 34: influence is earned by events, never by existing — this unit pays out when it defends (is attacked).
