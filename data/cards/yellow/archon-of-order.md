---
name: Archon of Order
type: unit
cost: 7
power: 7
health: 7
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"startOfRound":{"ops":[{"op":"imprison","t":"auto","auto":{"scope":"eachZone"}}]}}
---
At the start of your round, imprison up to one unit in each enemy zone.

## Design notes

⚑ Imprison target is auto-picked: strongest eligible enemy unit (deterministic; DECISIONS/spec §3.3). "Each enemy zone" = each zone holding enemy units.
