---
name: Last Stand
type: action
cost: 7
pips: red, red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"ready","side":"friendly"},{"op":"lastStand","moveInfluence":2,"attackLife":2,"endLife":7,"endInfluence":7}]}
---
Ready each of your units. They don't exhaust this round. For each of your units that moves, lose 2 Influence. For each of your units that attacks, lose 2 Life. At the end of the round, lose 7 Life and lose 7 Influence.

## Design notes

2026-07-16 (#107, Griff's locked spec — "everything stacks, be careful as you take actions"): full rework from the old "+2 Power this round, lose 2 life." Now it readies your whole board and suspends exhaustion for the round (your units don't exhaust from moving, attacking, blocking, intercepting, or activating), turning it into a frenzy engine — but every action is taxed: each move cedes 2 Influence, each attacking unit costs 2 Life (per unit, so a three-unit charge is 6), and both stack with every action you take. At round end you pay a flat 7 Life and 7 Influence.

New engine primitives: a round-scoped per-seat pact list (`state.lastStands`, cleared at the round boundary), the `lastStand` op that arms it, per-action tolls billed in `moveUnit`/`attackDeclare`, and the end-of-round reckoning in `endRound`. Readings locked here (see the PR flags): the no-exhaust and tolls cover any unit you control this round, including ones played AFTER Last Stand; the move toll fires on the move ACTION (not effect-driven relocations); the attack toll is per attacking unit per attack; and a second cast stacks a second, independently-billed pact.
