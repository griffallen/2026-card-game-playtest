---
name: Raging Inferno
type: action
cost: 6
pips: red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unitOrBase","side":"any","baseSide":"enemy"}],"onPlay":[{"op":"damage","t":"chosen0","n":6}],"onDiscard":[{"op":"returnSourceToHand"}]}
---
Deal 6 damage to target unit or base. If this card is discarded, immediately return it to your hand.

## Design notes

Session 006: 5 damage → 6, matching the face-capable burn grammar (damage = cost): Searing Bolt 2@2, Volcanic Slam 3@3, Rupture 4@4, Raging Inferno 6@6.
