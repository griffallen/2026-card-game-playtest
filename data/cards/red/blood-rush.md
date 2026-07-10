---
name: Blood Rush
type: action
cost: 2
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"buff","t":"chosen0","p":2,"dur":"round"},{"op":"grant","t":"chosen0","kw":{"k":"rush"},"dur":"round"}]}
---
Target unit gets +2 Power and Rush this round. Overextend 1.

## Design notes

⚑ Overextend printed on an action/upgrade is inert pending the designer card pass — the designer defined Overextend as a unit combat gamble (decision 35), so the influence-cede reading was removed.
