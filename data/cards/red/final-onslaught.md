---
name: Final Onslaught
type: action
cost: 5
pips: red, red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"ready","side":"friendly","t":"chosen0"},{"op":"extraAction"},{"op":"doom","t":"chosen0"}]}
---
Ready one of your units and take an action with it. Then deal it damage equal to its remaining Health — it dies — and deal that much damage to each other unit in its zone, yours included.

## Design notes

Decision 43: rounds have no extra turns — "extra turn" became ready one of your units + an extra action. Unplayable with no friendly unit to ready, by design.

#107 rework (2026-07-16). The doom stopped killing "units the attack wounded" and became a self-immolation bomb: Y = the readied unit's remaining Health, the unit always dies (Griff #107: "it ensures it dies, thus its final onslaught"), then Y is dealt to every other unit in its zone — friend and foe (Griff: "damage hits all units, even your own"). The card's effects are unchanged (ready → extraAction → doom); only the doom's execution in the engine changed. Two edges to know: (1) "always dies" is a guaranteed destroy, so armor/Shielded on the doomed unit never saves it (dealing Y-as-damage would let armor blunt it below lethal — the ruling says it always dies, so the engine destroys it). (2) The engine's extra action is generic — it does not force the action to be taken WITH the readied unit, and if that unit dies during its own action there is nothing left to immolate (no blast). Both flagged to Blaine at build time.
