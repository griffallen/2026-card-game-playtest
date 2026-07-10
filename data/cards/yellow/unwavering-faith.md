---
name: Unwavering Faith
type: action
cost: 3
influenceTrigger: onPlay
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unitOrBase","side":"any","baseSide":"any"}],"onPlay":[{"op":"heal","t":"chosen0","n":3},{"op":"influence","n":1}]}
---
Heal 3 damage from a unit or your base. Influence: +1.
