---
name: Inquisitor
type: unit
cost: 6
power: 4
health: 5
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onEnterZone":[{"op":"imprison","t":"auto","auto":{"scope":"enteredZone","maxPower":4}}]}
---
When this enters a zone, imprison target unit with 4 Power or less.

## Design notes

⚑ Imprison target is auto-picked: strongest eligible enemy unit (deterministic; DECISIONS/spec §3.3). Fires on deploy and on every move.
