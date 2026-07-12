---
name: Gateward Colossus
type: unit
cost: 6
power: 3
health: 9
keywords: guard, armor 2, cantAttack
pips: yellow, yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDefend":[{"op":"influence","n":2}]}
---
Guard. Armor 2. Can't attack. When this defends, gain 2 Influence.

## Design notes

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. The wall keeps its post; imprisonWatcher dies with prison. Armor 2 + free blocks = the gate that holds.

2026-07-12 (decision 85, issues #25/#24 — designer: "yes, push these up"): door 2 (retaliation)
became law and yellow's repair pass landed with it — guard defend-payouts up one notch (they now
trigger whether the guard blocks OR is attacked directly), wall power up one point (a wall's power
is also its retaliation now). ⚑ ratify/veto per card.
