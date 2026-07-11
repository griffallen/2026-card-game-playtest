---
name: Fiery Impaler
type: unit
cost: 3
power: 3
health: 3
pips: red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onAttack":[{"op":"damage","t":"autoSplash","n":1}]}
---
When this attacks a unit, it also deals 1 damage to the strongest other enemy unit in that zone.

## Design notes

Session 006: text now states the deterministic pick (decision 51) instead of the vague "an adjacent unit".
