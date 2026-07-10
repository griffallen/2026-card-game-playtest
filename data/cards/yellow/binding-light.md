---
name: Binding Light
type: action
cost: 2
influenceTrigger: onPlay
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"imprison","t":"chosen0"},{"op":"influence","n":1}]}
---
Imprison target unit. If your Influence is 10+, it can't attack players. Influence: +1.

## Design notes

⚑ The 10+ rider is redundant while imprisoned (prisoners cannot attack at all) — dropped pending design.
