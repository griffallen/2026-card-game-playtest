---
name: Radiant Wall
type: action
cost: 5
influenceTrigger: onPlay
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"buff","t":"chosen0","armor":3,"dur":"perm"},{"op":"influence","n":1}]}
---
Target unit gets Armor 3, permanently. Gain 1 Influence.

## Design notes

Session 006: 4 → 5 mana (armor ladder — see Radiant Aegis).
