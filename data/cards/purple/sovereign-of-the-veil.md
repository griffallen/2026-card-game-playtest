---
name: Sovereign of the Veil
type: unit
cost: 7
power: 5
health: 6
keywords: hidden, infiltrate, sneak
pips: purple, purple, purple
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"sneak":{"targets":[{"t":"unit","side":"enemy"}],"ops":[{"op":"damage","t":"chosen0","n":4},{"op":"influence","n":1}]}}
art: /cards/sovereign-of-the-veil.svg
---
Hidden. Infiltrate. Sneak — deal 4 damage to target enemy unit in this zone and gain 1 Influence.

## Design notes

2026-07-11 (v3 churn pass 2, charter #10: reactive control): the finisher does a lot (decision 68): appears anywhere, untouchable while ready, and its knife both cuts and steals.
