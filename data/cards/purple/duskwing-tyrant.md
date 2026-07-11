---
name: Duskwing Tyrant
type: unit
cost: 4
power: 3
health: 3
keywords: hidden, sneak
pips: purple, purple
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"sneak":{"targets":[{"t":"unit","side":"enemy"}],"ops":[{"op":"damage","t":"chosen0","n":2}]}}
art: /cards/duskwing-tyrant.svg
---
Hidden. Sneak — deal 2 damage to target enemy unit in this zone.

## Design notes

2026-07-11 (v3 churn pass 2, charter #10: reactive control): the tyrant becomes a Hidden ambusher; its Sneak is the knife-drawer's damage blade (decision 60).
