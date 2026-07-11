---
name: High Justiciar
type: unit
cost: 4
power: 3
health: 5
keywords: guard
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDefend":[{"op":"influence","n":2}]}
---
Guard. When this defends, gain 2 Influence.

## Design notes

Decision 51 text (deterministic pick, stated on the card).

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Guard is free blocking in v3 — the Justiciar holds the line and the court pays it.
