---
name: Cull the Weak
type: action
cost: 4
pips: purple, purple
status: draft
art: /cards/cull-the-weak.svg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"damageFilter","f":{"side":"enemy"},"n":1},{"op":"draw","n":1}]}
---
Deal 1 damage to every enemy unit. Draw a card.
