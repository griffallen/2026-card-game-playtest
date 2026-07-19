---
name: Duskwing Assassin
type: unit
cost: 4
power: 1
health: 4
keywords: hidden, sneak
pips: purple, purple
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"sneak":{"targets":[{"t":"unit","side":"enemy"}],"ops":[{"op":"damage","t":"chosen0","n":2}]}}
art: /cards/duskwing-tyrant.jpg
---
Hidden. Sneak — deal 2 damage to target enemy unit in this zone.

## Design notes

2026-07-11 (v3 churn pass 2, charter #10: reactive control): the tyrant becomes a Hidden ambusher; its Sneak is the knife-drawer's damage blade (decision 60).

2026-07-19 (#122, Griff's rework): display name retitled to **Duskwing Assassin** and re-statted 3/3 → 1/4 (a
frailer, stickier ambusher). The **slug stays `duskwing-tyrant`** on purpose — the art asset is keyed to the
slug (`/cards/duskwing-tyrant.jpg`) and the prebuilt deck lists reference it, so a true file rename would
orphan the art and break the deck. Only `name:` changed; keywords, the Sneak, cost, and pips are untouched.
