---
name: Pacify
type: action
cost: 2
pips: purple
status: canon
art: /cards/pacify.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"exhaust","t":"chosen0"},{"op":"influence","n":-2},{"op":"influenceOpponent","n":2}]}
---
Exhaust an enemy unit. You and your opponent lose 2 Hope.
