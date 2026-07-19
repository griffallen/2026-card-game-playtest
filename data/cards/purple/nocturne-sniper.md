---
name: Nocturne Sniper
type: unit
cost: 5
power: 1
health: 3
keywords: ranged 3
influenceTrigger: onKill
pips: purple, purple
status: draft
art: /cards/nocturne-sniper.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onKill":[{"op":"influence","n":1}]}
---
Ranged 3. When this defeats a unit, gain 1 Influence.

## Design notes

2026-07-12 (decision 80, issue #24 Q9 — designer's charter, agent redesign ⚑ ratify/veto): Ranged
reborn as an ability action ("exhaust: deal N to one enemy unit in any zone") with ordinary attacks;
purple keeps two archers and the rest of the court re-identifies around non-attack keywords. THIS card: 4/3 → 1/3 with Ranged 3 — the named sniper keeps the bow; a lethal volley still pays its bounty (decision 74).
