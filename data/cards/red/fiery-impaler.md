---
name: Fiery Impaler
type: unit
cost: 3
power: 3
health: 3
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onAttack":[{"op":"damage","t":"autoSplash","n":1}]}
---
When this attacks a unit, it deals 1 damage to an adjacent unit.

## Design notes

⚑ "Adjacent unit" auto-targets the strongest other enemy unit in the defending zone (deterministic pick).
