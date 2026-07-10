---
name: Reckless Charge
type: action
cost: 1
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"grant","t":"chosen0","kw":{"k":"rush"},"dur":"perm"}]}
---
Target unit gains Rush. Overextend 1.

## Design notes

⚑ Overextend printed on an action/upgrade is inert pending the designer card pass — the designer defined Overextend as a unit combat gamble (decision 35), so the influence-cede reading was removed.
