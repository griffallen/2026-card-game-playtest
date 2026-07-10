---
name: Smash Through
type: action
cost: 2
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly","withKw":"rush"}],"onPlay":[{"op":"grant","t":"chosen0","kw":{"k":"breakthrough","n":2},"dur":"round"}]}
---
Target unit with Rush gains Breakthrough 2 this round.
