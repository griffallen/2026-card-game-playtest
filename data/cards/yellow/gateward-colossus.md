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
effects: {"onDefend":[{"op":"influence","n":1}]}
---
Guard. Armor 2. Can't attack. When this defends, gain 1 Influence.

## Design notes

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. The wall keeps its post; imprisonWatcher dies with prison. Armor 2 + free blocks = the gate that holds.
