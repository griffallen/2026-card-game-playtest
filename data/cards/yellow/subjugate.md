---
name: Subjugate
type: action
cost: 3
influenceTrigger: onPlay
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"imprison","t":"chosen0"},{"op":"buff","t":"chosen0","p":-1,"dur":"perm","cond":{"influenceAtMost":5}},{"op":"influence","n":1}]}
---
Imprison target unit. If your Influence is 5 or less, it gets -1 Power. Influence: +1.
