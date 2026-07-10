---
name: Final Onslaught
type: action
cost: 8
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"ready","side":"friendly","t":"chosen0"},{"op":"extraAction"}]}
---
Ready one of your units, then immediately take an extra action. Overextend 5.

## Design notes

Decision 43: rounds have no extra turns — "extra turn" became ready one of your units + an extra action. Unplayable with no friendly unit to ready, by design. ⚑ Overextend printed on an action/upgrade is inert pending the designer card pass — the designer defined Overextend as a unit combat gamble (decision 35), so the influence-cede reading was removed.
