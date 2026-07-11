---
name: Binding Light
type: action
cost: 2
pips: yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy","maxPower":4}],"onPlay":[{"op":"exhaust","t":"chosen0"}]}
---
Exhaust target enemy unit with 4 or less Power.

## Design notes

Session 006, prison ladder: Binding Light 2 = midweight lockup, pure tempo (no influence rider). The old 10+ rider was dead text — prisoners already can't attack anything (decision 50 spirit).

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Rung 2: the verdict of stillness — exhaustion is the new soft lock (blocking costs ready units in v3, so this bites twice).
