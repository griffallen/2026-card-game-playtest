---
name: Light of Authority
type: action
cost: 4
influenceTrigger: onPlay
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"buff","t":"chosen0","p":3,"dur":"round"},{"op":"influence","n":1}]}
---
Target unit gets +3 Power this round. Gain 1 Influence.

## Design notes

Session 006: 6 → 3 mana (red's Cataclysmic Charge gives +3 AND Breakthrough 3 at 4 — yellow's pump can cost less because it converts defense, not kills).
