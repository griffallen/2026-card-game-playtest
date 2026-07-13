---
name: Fiery Impaler
type: unit
cost: 3
power: 3
health: 3
pips: red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onAttack":[{"op":"splashReap","n":1,"influence":1}]}
---
When this attacks a unit, it also deals 1 damage to a unit of your choice in the same zone. If that unit dies, gain +1 influence.

## Design notes

Session 006: text now states the deterministic pick (decision 51) instead of the vague "an adjacent unit".

2026-07-13 (designer, PR #46 → decision 93): the pick becomes a CHOICE — declared with the attack
(decision 24 stands: no mid-resolution input), any unit in the combat zone except the declared
target, "even your own" (friendly fire is deliberate, and red — Scar synergy is legal). A kill by
the skewer reaps 1 influence. New vocabulary: op `splashReap`, attack-action `splash` declarations.
⚑ Agent rulings within the door: the skewer can't hit the attack's own target (the text says
"ALSO deals"); ready enemy Hidden units refuse the choice (decision 76); no candidates → the
trigger fizzles and the attack proceeds.
