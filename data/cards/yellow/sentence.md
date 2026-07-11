---
name: Sentence
type: action
cost: 4
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"imprison","t":"chosen0"},{"op":"draw","n":1}]}
---
Imprison target unit. Draw a card.

## Design notes

Session 006, prison ladder: Sentence 4 = imprison that replaces itself. The old 10+ rider duplicated what imprisonment already does.
