---
name: High Justiciar
type: unit
cost: 4
power: 3
health: 5
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"startOfRound":{"ops":[{"op":"imprison","t":"auto","auto":{"scope":"otherZone"}}]}}
---
At the start of your round, imprison the strongest enemy unit outside this unit's zone.

## Design notes

Decision 51 text (deterministic pick, stated on the card).
