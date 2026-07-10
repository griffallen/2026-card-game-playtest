---
name: Crimson Behemoth
type: unit
cost: 5
power: 6
health: 6
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onAttackBase":[{"op":"damageFilter","f":{"side":"all","zone":"sameAsSelf","other":true},"n":2}]}
---
When this attacks a base, it deals 2 damage to all adjacent zones.

## Design notes

⚑ Re-ruled after playtest 004: the assault splashes 2 damage onto every OTHER unit in the defended Home zone, both sides (the original "zones adjacent to the Behemoth" reading only ever hit Neutral — dead text during a siege).
