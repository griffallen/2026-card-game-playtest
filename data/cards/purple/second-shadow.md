---
name: Second Shadow
type: action
cost: 5
pips: purple, purple
status: canon
art: /cards/second-shadow.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"ready","side":"friendly","t":"chosen0"},{"op":"draw","n":1}]}
---
Ready one of your units. Draw a card.
