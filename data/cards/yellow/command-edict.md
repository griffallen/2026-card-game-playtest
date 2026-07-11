---
name: Command Edict
type: action
cost: 7
influenceTrigger: onPlay
pips: yellow, yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"buff","t":{"side":"friendly"},"armor":1,"dur":"perm"},{"op":"influence","n":2}]}
---
Your units get Armor 1, permanently. Gain 2 Influence.

## Design notes

Session 006 redesign: was +2 Armor for one round at 7 — a fog effect priced like a finisher. Now the fortress decree: permanent board-wide Armor 1.
