---
name: Containment Priest
type: unit
cost: 2
power: 2
health: 3
pips: yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onEnterZone":[{"op":"imprison","t":"auto","auto":{"scope":"enteredZone"}}]}
---
When this enters a zone, imprison the strongest enemy unit there.

## Design notes

Decision 51: the pick is deterministic (strongest eligible; ties go to the earliest arrival) and the text says so. Fires on deploy and on every move.
