---
name: Radiant Judgment
type: action
cost: 5
influenceTrigger: onPlay
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"imprison","t":"auto","f":{"side":"enemy","maxPower":3}},{"op":"influence","n":2}]}
---
Imprison all enemy units with 3 Power or less. Influence: +2.
