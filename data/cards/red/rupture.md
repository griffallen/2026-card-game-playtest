---
name: Rupture
type: action
cost: 4
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unitOrBase","side":"any","baseSide":"enemy"}],"onPlay":[{"op":"damage","t":"chosen0","n":4}]}
---
Deal 4 damage to target unit or base. Overextend 3.

## Design notes

⚑ Overextend printed on an action/upgrade is inert pending the designer card pass — the designer defined Overextend as a unit combat gamble (decision 35), so the influence-cede reading was removed.
