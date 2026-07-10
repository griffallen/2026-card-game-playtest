---
name: Detain
type: action
cost: 6
influenceTrigger: onPlay
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"imprison","t":"chosen0"},{"op":"influence","n":1}]}
---
Imprison target enemy unit. You gain 1 Influence.
