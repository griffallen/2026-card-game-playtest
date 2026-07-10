---
name: Noble Purifier
type: unit
cost: 3
power: 3
health: 3
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onAttack":[{"op":"imprison","t":"auto","auto":{"scope":"targetZone"}}]}
---
When this attacks, you may imprison a unit in the defending zone.

## Design notes

⚑ Imprison target is auto-picked: strongest eligible enemy unit (deterministic; DECISIONS/spec §3.3). The "may" auto-applies (strictly beneficial; DECISIONS 24).
