---
name: Assassin's Contract
type: action
cost: 4
pips: purple
status: canon
art: /cards/assassin-s-contract.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"any"}],"onPlay":[{"op":"damage","t":"selfBase","n":1,"per":{"count":"targetRemainingHealth"}},{"op":"influenceOwner","t":"chosen0","n":1,"per":{"count":"targetCostHalf"}},{"op":"destroy","t":"chosen0"}]}
---
Destroy target unit. You lose Life equal to its remaining Health, and its owner gains Influence equal to half its printed cost, rounded up.
