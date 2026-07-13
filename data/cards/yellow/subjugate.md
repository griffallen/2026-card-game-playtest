---
name: Subjugate
type: action
cost: 3
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"buff","t":"chosen0","p":-2,"dur":"perm"}]}
---
Target enemy unit gets −2 Power permanently.

## Design notes

Session 006, prison ladder: Subjugate 3 = unrestricted imprison that leaves a mark — the prisoner comes back weaker. The old "if your Influence is 5 or less" condition was noise; the rider is now unconditional.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Rung 3: the breaking — permanent humiliation instead of walls.
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): the flat 'Gain 1 Influence' rider is cut (your Iron Plating direction, applied wholesale — influence should be earned at moments, not stapled to spells; this slows yellow's influence clock directly). ⚑ ratify/veto.
