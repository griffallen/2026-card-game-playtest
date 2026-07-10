---
name: Burn the Frontline
type: action
cost: 7
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"zone"}],"onPlay":[{"op":"damageFilter","f":{"side":"all","zone":"chosenZone"},"n":4}]}
---
Deal 4 damage to all units in one zone. Overextend 4.

## Design notes

⚑ Overextend printed on an action/upgrade is inert pending the designer card pass — the designer defined Overextend as a unit combat gamble (decision 35), so the influence-cede reading was removed.
