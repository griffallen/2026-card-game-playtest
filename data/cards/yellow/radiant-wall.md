---
name: Radiant Wall
type: action
cost: 4
influenceTrigger: onPlay
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"buff","t":"chosen0","armor":3,"dur":"perm"},{"op":"influence","n":1}]}
---
Give target unit Armor 3. Influence: +1.
