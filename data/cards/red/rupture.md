---
name: Rupture
type: action
cost: 4
pips: red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unitOrBase","side":"any","baseSide":"enemy"}],"onPlay":[{"op":"damage","t":"chosen0","n":4},{"op":"influenceOpponent","n":2}]}
---
Deal 4 damage to target unit or base. Your opponent loses 2 Hope.
