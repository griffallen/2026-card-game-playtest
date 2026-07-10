---
name: Cataclysmic Charge
type: action
cost: 6
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"grant","t":"chosen0","kw":{"k":"rush"},"dur":"round"},{"op":"buff","t":"chosen0","p":3,"dur":"round"}]}
---
Target unit gains Rush and +3 Power this round. Overextend 4.

## Design notes

⚑ Overextend printed on an action/upgrade is inert pending the designer card pass — the designer defined Overextend as a unit combat gamble (decision 35), so the influence-cede reading was removed.
