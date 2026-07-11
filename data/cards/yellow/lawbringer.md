---
name: Lawbringer
type: unit
cost: 4
power: 4
health: 4
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onEnterZone":[{"op":"imprison","t":"auto","auto":{"scope":"enteredZone"}}]}
---
When this enters a zone, imprison the strongest enemy unit there.

## Design notes

Decision 51 text. Containment Priest's big sibling: full statline plus the same arrest, two mana later.
