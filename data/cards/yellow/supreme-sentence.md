---
name: Supreme Sentence
type: action
cost: 7
pips: yellow, yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy","count":2}],"onPlay":[{"op":"imprison","t":"chosen0"},{"op":"imprison","t":"chosen1"}]}
---
Imprison two target enemy units.

## Design notes

Session 006 redesign under decision 50 (no dead thresholds): the old "if your Influence is 15 or more" could never fire — 15 is the win. Now it simply passes two sentences anywhere on the board.
