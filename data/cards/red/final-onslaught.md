---
name: Final Onslaught
type: action
cost: 5
pips: red, red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"ready","side":"friendly","t":"chosen0"},{"op":"extraAction"},{"op":"doom","t":"chosen0"}]}
---
Ready one of your units, then immediately take an extra action. After the action, kill this unit and any unit damaged by this unit's attack.

## Design notes

Decision 43: rounds have no extra turns — "extra turn" became ready one of your units + an extra action. Unplayable with no friendly unit to ready, by design.
