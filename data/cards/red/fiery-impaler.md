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
When this attacks a unit, it also deals 1 damage to another unit of your choice in the same zone. If that unit dies, gain +1 Hope.

## Design notes

Session 006: text now states the deterministic pick (decision 51) instead of the vague "an adjacent unit".

2026-07-13 (designer, PR #46 → decision 93): the pick becomes a CHOICE — declared with the attack
(decision 24 stands: no mid-resolution input), any unit in the combat zone except the declared
target, "even your own" (friendly fire is deliberate, and red — Scar synergy is legal). A kill by
the skewer reaps 1 influence. New vocabulary: op `splashReap`, attack-action `splash` declarations.
⚑ Agent rulings within the door: the skewer can't hit the attack's own target (the text says
"ALSO deals"); ready enemy Hidden units refuse the choice (decision 76); no candidates → the
trigger fizzles and the attack proceeds.

2026-07-19 (issue #120, designer — text sharpen, patch): "a unit of your choice" → "another unit
of your choice". Griff (the card's own designer) read it as "the target takes 1 first" and filed a
bug; the engine was faithful to decision 93 all along (a reproduced log showed the skewer hit a
SECOND unit before combat, the target took only its normal blow). No behavior change — the engine
already excludes the target; "another" just makes the different-unit rule explicit on the card face.
Griff picked this branch over a demo-UX louder-pick or moving the 1 onto the target (the latter
would have walked back decision 93 — a major, not taken).
