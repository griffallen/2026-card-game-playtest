---
name: Execution Swing
type: action
cost: 6
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"any","mustBeDamaged":true}],"onPlay":[{"op":"destroy","t":"chosen0"}]}
---
Destroy target damaged unit. Overextend 3.

## Design notes

⚑ Overextend printed on an action/upgrade is inert pending the designer card pass — the designer defined Overextend as a unit combat gamble (decision 35), so the influence-cede reading was removed.
