---
name: Subjugate
type: action
cost: 3
influenceTrigger: onPlay
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"buff","t":"chosen0","p":-2,"dur":"perm"},{"op":"influence","n":1}]}
---
Target enemy unit gets −2 Power permanently. Gain 1 Influence.

## Design notes

Session 006, prison ladder: Subjugate 3 = unrestricted imprison that leaves a mark — the prisoner comes back weaker. The old "if your Influence is 5 or less" condition was noise; the rider is now unconditional.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Rung 3: the breaking — permanent humiliation instead of walls.
