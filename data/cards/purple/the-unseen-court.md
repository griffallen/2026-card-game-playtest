---
name: The Unseen Court
type: unit
cost: 8
power: 6
health: 7
keywords: hidden
influenceTrigger: onKill
pips: purple, purple, purple
status: draft
art: /cards/the-unseen-court.svg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onKill":[{"op":"influence","n":2}]}
---
Hidden. When this defeats a unit, gain 2 Influence.

## Design notes

2026-07-12 (decision 80, issue #24 Q9 — designer's charter, agent redesign ⚑ ratify/veto): Ranged
reborn as an ability action ("exhaust: deal N to one enemy unit in any zone") with ordinary attacks;
purple keeps two archers and the rest of the court re-identifies around non-attack keywords. THIS card: ranged → Hidden — the court is unseen, as the name always claimed; its kills still pay double.
