---
name: Collateral Damage
type: action
cost: 3
pips: red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"any","count":2}],"onPlay":[{"op":"damage","t":"chosen0","n":2},{"op":"damage","t":"chosen1","n":2}]}
---
Deal 2 damage to two different target units.
