---
name: Crimson Behemoth
type: unit
cost: 5
power: 6
health: 5
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onAttackBase":[{"op":"damageFilter","f":{"side":"all","zone":"sameAsSelf","other":true},"n":2}]}
---
When this attacks a base, it deals 2 damage to every other unit in that zone — yours included.

## Design notes

Re-ruled after playtest 004: the assault splashes the defended Home zone, both sides (the original "adjacent zones" reading only ever hit Neutral — dead text during a siege). Session 006: 6/6 → 6/5 to sit on the statline grammar, and the text now says what actually happens.
