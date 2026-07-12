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
effects: {"onDefend":[{"op":"influence","n":3}]}
---
Guard. When this defends, gain 3 Influence.

## Design notes

Decision 51 text (deterministic pick, stated on the card).

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Guard is free blocking in v3 — the Justiciar holds the line and the court pays it.

2026-07-12 (decision 85, issues #25/#24 — designer: "yes, push these up"): door 2 (retaliation)
became law and yellow's repair pass landed with it — guard defend-payouts up one notch (they now
trigger whether the guard blocks OR is attacked directly), wall power up one point (a wall's power
is also its retaliation now). ⚑ ratify/veto per card.
