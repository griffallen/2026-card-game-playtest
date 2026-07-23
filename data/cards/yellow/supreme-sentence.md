---
name: Supreme Sentence
type: action
cost: 7
pips: yellow, yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy","count":2,"upTo":true}],"onPlay":[{"op":"exhaust","t":"chosen0"},{"op":"damage","t":"chosen0","n":1,"per":{"count":"positiveHope"}},{"op":"exhaust","t":"chosen1"},{"op":"damage","t":"chosen1","n":1,"per":{"count":"positiveHope"}},{"op":"influence","n":7,"cond":{"influenceAtMost":0}}]}
---
Up to two target enemy units anywhere are exhausted and take damage equal to your Hope. If your Hope is less than 1, gain 7 Hope.

## Design notes

Session 006 redesign under decision 50 (no dead thresholds): the old "if your Influence is 15 or more" could never fire — 15 is the win. Now it simply passes two sentences anywhere on the board.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Rung 8: the highest court — two verdicts, anywhere, with teeth.
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): damage 2 → 3 per target: a 7-cost under the decision-68 convex curve should end two threats, not inconvenience them. ⚑ ratify/veto.
