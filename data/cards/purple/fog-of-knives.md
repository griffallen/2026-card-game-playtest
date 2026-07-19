---
name: Fog of Knives
type: action
cost: 6
pips: purple, purple
status: draft
art: /cards/fog-of-knives.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"zone"}],"onPlay":[{"op":"damageFilter","f":{"side":"enemy","zone":"chosenZone"},"n":3}]}
---
Choose a zone. Deal 3 damage to every enemy unit there.
