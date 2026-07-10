---
name: Prison Warrant
type: action
cost: 1
influenceTrigger: onPlay
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"imprison","t":"chosen0"},{"op":"influence","n":1}]}
---
Imprison target enemy unit in this zone. Influence: +1.

## Design notes

⚑ "In this zone" is meaningless for a card played from hand — implemented as any enemy unit. Needs design.
