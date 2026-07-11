---
name: Obscure
type: action
cost: 3
pips: purple, purple
status: draft
art: /cards/obscure.svg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"preventBase","n":2},{"op":"draw","n":1}]}
---
Prevent the next 2 damage to your base this round. Draw a card.
