---
name: Sentence
type: action
cost: 6
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"},{"t":"unit","side":"enemy"}],"onPlay":[{"op":"capture","t":"chosen1","by":"chosen0"},{"op":"draw","n":1}]}
---
Target unit you control captures target enemy unit. Draw a card.

## Design notes

Session 006, prison ladder: Sentence 4 = imprison that replaces itself. The old 10+ rider duplicated what imprisonment already does.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Rung 4: the full sentence — any prisoner, plus the paperwork (draw).
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): 4 → 5: capture-anything plus a draw was priced under voluntary release; death-only (decision 92) made it premium removal. ⚑ ratify/veto.

2026-07-15 (#91 balance pass — Griff: "do all the card cuts"): cost 5 → 6 — moves in step with Imprisonment Chamber so the capture rung holds across the pool. Full pass: griffs-yellow 69.7% → 56.0% vs griffs-red (N=300). ⚑ ratify/veto.
