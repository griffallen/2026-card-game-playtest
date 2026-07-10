---
name: Containment Priest
type: unit
cost: 2
power: 2
health: 3
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onEnterZone":[{"op":"imprison","t":"auto","auto":{"scope":"enteredZone"}}]}
---
When this enters a zone, imprison target enemy unit in that zone.

## Design notes

⚑ Imprison target is auto-picked: strongest eligible enemy unit (deterministic; DECISIONS/spec §3.3). Fires on deploy and on every move.
