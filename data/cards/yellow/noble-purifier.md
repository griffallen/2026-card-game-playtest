---
name: Noble Purifier
type: unit
cost: 3
power: 3
health: 3
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onAttack":[{"op":"imprison","t":"auto","auto":{"scope":"targetZone"}}]}
---
When this attacks, imprison the strongest enemy unit in the defending zone.

## Design notes

Decision 51 text (deterministic pick — it may be the attack target itself, which cancels the counter-punch).
