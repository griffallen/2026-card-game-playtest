---
name: Mobilize the Faithful
type: action
cost: 6
influenceTrigger: onPlay
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"buff","t":{"side":"friendly"},"p":1,"dur":"perm"},{"op":"grant","t":{"side":"friendly"},"kw":{"k":"guard"},"dur":"perm"},{"op":"influence","n":1}]}
---
Your units get +1 Power and gain Guard, permanently. Gain 1 Influence.

## Design notes

Session 006: 4 → 6 mana. A permanent board-wide pump plus mass Guard was priced like a trick; it is a haymaker (red's Warpath gives +1 for one round at 2).
