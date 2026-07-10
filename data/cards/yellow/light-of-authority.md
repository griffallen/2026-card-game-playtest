---
name: Light of Authority
type: action
cost: 6
influenceTrigger: onPlay
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"buff","t":"chosen0","p":3,"dur":"round"},{"op":"influence","n":1}]}
---
Give target unit +3 Power until end of round. Influence: +1.
