---
name: Sentence
type: action
cost: 4
influenceTrigger: onPlay
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"imprison","t":"chosen0"},{"op":"influence","n":1}]}
---
Imprison target unit. If your Influence is 10+, it can't move or attack. Influence: +1.

## Design notes

⚑ The 10+ rider duplicates what imprisonment already does — dropped pending design.
