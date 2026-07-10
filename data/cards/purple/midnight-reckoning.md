---
name: Midnight Reckoning
type: action
cost: 7
status: draft
art: /cards/midnight-reckoning.svg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"damageFilter","f":{"side":"enemy"},"n":3},{"op":"draw","n":1}]}
---
Deal 3 damage to every enemy unit. Draw a card.
