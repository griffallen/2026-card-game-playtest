---
name: Archon of Order
type: unit
cost: 7
power: 7
health: 7
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"startOfRound":{"ops":[{"op":"imprison","t":"auto","auto":{"scope":"eachZone"}}]}}
---
At the start of your round, imprison the strongest enemy unit in each zone.

## Design notes

Decision 51 text (deterministic pick per zone; zones with no eligible enemies are skipped). The mass-jailer — remember each prisoner costs 1 Influence per round.
