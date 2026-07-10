---
name: Radiant Aegis
type: action
cost: 2
influenceTrigger: onPlay
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"buff","t":"chosen0","armor":2,"dur":"perm"},{"op":"influence","n":1}]}
---
Target unit gets Armor 2, permanently. Gain 1 Influence.

## Design notes

Session 006: 1 → 2 mana. Armor 2 blanks red's whole cheap-burn suite; at 1 mana it was the best card in the pool. The armor ladder: Aegis 2 (Armor 2, one unit), Radiant Wall 5 (Armor 3), Command Edict 7 (Armor 1, everyone).
