---
name: Light's Vanguard
type: unit
cost: 8
power: 7
health: 8
keywords: guard, armor 1, shielded
influenceTrigger: onDefend
pips: yellow, yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDefend":[{"op":"influence","n":2}]}
---
Guard. Armor 1. Shielded. When this defends, gain 2 Influence.

## Design notes

Flying is canon (decision 48): may move to any zone, ignoring adjacency.

2026-07-11 (v3 churn pass 4): flying is cut — the Vanguard lands and becomes the great shield: 7/8 Guard (free blocks in v3), Armor 1, Shielded, and the court pays 2 when it holds the line. An 8-cost that does a lot (decision 68).
