---
name: Supreme Sentence
type: action
cost: 7
pips: yellow, yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy","count":2,"upTo":true}],"onPlay":[{"op":"exhaust","t":"chosen0"},{"op":"damage","t":"chosen0","n":2},{"op":"exhaust","t":"chosen1"},{"op":"damage","t":"chosen1","n":2}]}
---
Up to two target enemy units anywhere are exhausted and take 2 damage each.

## Design notes

Session 006 redesign under decision 50 (no dead thresholds): the old "if your Influence is 15 or more" could never fire — 15 is the win. Now it simply passes two sentences anywhere on the board.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Rung 8: the highest court — two verdicts, anywhere, with teeth.
