---
name: Devout Intervention
type: action
cost: 4
influenceTrigger: onPlay
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"preventBase","n":3},{"op":"influence","n":1}]}
---
Prevent the next 3 damage to your base this round. Gain 1 Influence.

## Design notes

Session 006: 6 → 3 mana. A one-round shield priced like a wall.
