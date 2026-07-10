---
name: Shadowstep
type: action
cost: 2
status: draft
art: /cards/shadowstep.svg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"grant","t":"chosen0","kw":{"k":"flying"},"dur":"round"},{"op":"draw","n":1}]}
---
Target friendly unit gains Flying this round. Draw a card.
