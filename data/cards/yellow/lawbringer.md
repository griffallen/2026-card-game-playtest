---
name: Lawbringer
type: unit
cost: 4
power: 4
health: 4
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onEnterZone":[{"op":"imprison","t":"auto","auto":{"scope":"enteredZone"}}]}
---
When this enters a zone, imprison target unit.

## Design notes

⚑ Imprison target is auto-picked: strongest eligible enemy unit (deterministic; DECISIONS/spec §3.3). Fires on deploy and on every move.
