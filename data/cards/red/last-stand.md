---
name: Last Stand
type: action
cost: 8
pips: red, red, red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"ready","side":"friendly"},{"op":"lastStand","moveInfluence":4,"attackLife":4,"endLife":8,"endInfluence":8}]}
---
Ready each of your units. They don't exhaust this round. For each of your units that moves, lose 4 Hope. For each of your units that attacks, lose 4 Life. At the end of the round, lose 8 Life and lose 8 Hope.

## Design notes

2026-07-16 (#107, Griff's locked spec — "everything stacks, be careful as you take actions"): full rework from the old "+2 Power this round, lose 2 life." Now it readies your whole board and suspends exhaustion for the round (your units don't exhaust from moving, attacking, blocking, intercepting, or activating), turning it into a frenzy engine — but every action is taxed: each move cedes 2 Influence, each attacking unit costs 2 Life (per unit, so a three-unit charge is 6), and both stack with every action you take. At round end you pay a flat 7 Life and 7 Influence.

New engine primitives: a round-scoped per-seat pact list (`state.lastStands`, cleared at the round boundary), the `lastStand` op that arms it, per-action tolls billed in `moveUnit`/`attackDeclare`, and the end-of-round reckoning in `endRound`. Readings locked here (see the PR flags): the no-exhaust and tolls cover any unit you control this round, including ones played AFTER Last Stand; the move toll fires on the move ACTION (not effect-driven relocations); the attack toll is per attacking unit per attack; and a second cast stacks a second, independently-billed pact.

2026-07-18 (#98, Griff): cost 7->8, 3->4 red pips, tolls 2->4 (move Influence / attack Life), end reckoning 7->8. Rationale: the 8s flavor + harder to play; punish the multi-action harder.
