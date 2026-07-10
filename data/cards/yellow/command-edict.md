---
name: Command Edict
type: action
cost: 7
influenceTrigger: onPlay
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"buff","t":{"side":"friendly"},"armor":2,"dur":"round"},{"op":"influence","n":2}]}
---
Give all friendly units +2 Armor this round. Influence: +2.
