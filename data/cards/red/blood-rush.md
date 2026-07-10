---
name: Blood Rush
type: action
cost: 2
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"buff","t":"chosen0","p":2,"dur":"round"},{"op":"grant","t":"chosen0","kw":{"k":"rush"},"dur":"round"}]}
---
Target unit gets +2 Power and Rush this round.
