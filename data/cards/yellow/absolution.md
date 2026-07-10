---
name: Absolution
type: action
cost: 7
influenceTrigger: onPlay
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"removeNegative","t":"chosen0"},{"op":"influence","n":2}]}
---
Remove all negative effects from target unit. Gain 2 Influence.
