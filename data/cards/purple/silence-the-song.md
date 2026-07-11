---
name: Silence the Song
type: action
cost: 4
pips: purple, purple
status: draft
art: /cards/silence-the-song.svg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"buff","t":"chosen0","p":-2,"dur":"perm"},{"op":"draw","n":1}]}
---
Target enemy unit gets -2 Power permanently. Draw a card.
