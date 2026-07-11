---
name: Sunguard Defender
type: unit
cost: 2
power: 2
health: 3
keywords: guard
influenceTrigger: onDefend
pips: yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDefend":[{"op":"influence","n":1}]}
---
Guard. When this defends, gain 1 Influence.

## Design notes

Decision 34: influence is earned by events, never by existing — this unit pays out when it defends (is attacked).
