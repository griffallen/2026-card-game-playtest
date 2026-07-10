---
name: Mobilize the Faithful
type: action
cost: 4
influenceTrigger: onPlay
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"buff","t":{"side":"friendly"},"p":1,"dur":"perm"},{"op":"grant","t":{"side":"friendly"},"kw":{"k":"guard"},"dur":"perm"},{"op":"influence","n":1}]}
---
Give all friendly units +1 Power and Guard. Influence: +1.
