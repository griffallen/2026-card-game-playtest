---
name: Spark Hound
type: unit
cost: 1
power: 2
health: 1
keywords: rush, guard
pips: red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onAttack":[{"op":"buff","t":"self","p":1,"dur":"round"}]}
---
Rush. Guard. When this attacks, it gets +1 Power this round.

## Design notes

2026-07-12 (designer, PR #31): gains Guard — "they look like guard dogs." Note for the record:
red's charter forbids Guard ("red doesn't defend"); the designer's PR makes Spark Hound the first
sworn exception, and the charter now records it. A 1-cost 2/1 that blocks free and bites back.
