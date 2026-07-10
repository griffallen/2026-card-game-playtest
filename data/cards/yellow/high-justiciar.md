---
name: High Justiciar
type: unit
cost: 4
power: 3
health: 5
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"startOfRound":{"ops":[{"op":"imprison","t":"auto","auto":{"scope":"otherZone"}}]}}
---
At the start of your round, imprison target enemy unit in another zone.

## Design notes

⚑ Imprison target is auto-picked: strongest eligible enemy unit (deterministic; DECISIONS/spec §3.3). "Another zone" = any zone other than the Justiciar's.
