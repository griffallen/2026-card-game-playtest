---
name: Raging Inferno
type: action
cost: 6
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unitOrBase","side":"any","baseSide":"enemy"}],"onPlay":[{"op":"damage","t":"chosen0","n":5}]}
---
Deal 5 damage to target unit or base. Overextend 4.

## Design notes

⚑ Overextend printed on an action/upgrade is inert pending the designer card pass — the designer defined Overextend as a unit combat gamble (decision 35), so the influence-cede reading was removed.
