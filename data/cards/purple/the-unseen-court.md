---
name: The Unseen Court
type: unit
cost: 8
power: 0
health: 8
keywords: hidden, sneak
pips: purple, purple, purple
status: draft
art: /cards/the-unseen-court.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"sneak":{"ops":[{"op":"influence","n":1,"per":{"count":"exhaustedEnemyUnits"}},{"op":"damage","t":"enemyBase","n":1,"per":{"count":"allExhaustedUnits"}}]}}
---
Hidden. Sneak — gain 1 Influence for each Exhausted enemy unit; your opponent loses 1 Life for every Exhausted unit in play.

## Design notes

2026-07-12 (decision 80, issue #24 Q9 — designer's charter, agent redesign ⚑ ratify/veto): Ranged
reborn as an ability action ("exhaust: deal N to one enemy unit in any zone") with ordinary attacks;
purple keeps two archers and the rest of the court re-identifies around non-attack keywords. THIS card: ranged → Hidden — the court is unseen, as the name always claimed; its kills still pay double.

2026-07-19 (#122, Griff): reworked toward control. Body drops to 0/8 (a Hidden wall), the onKill
"gain 2 Influence" is gone, and it gains a target-less Sneak: gain 1 Influence for each Exhausted
enemy unit, and the opponent loses 1 Life for every Exhausted unit in play (both sides). Two new
global PerCounts back it — exhaustedEnemyUnits and allExhaustedUnits — counted live off the whole
board. The court excludes itself from the Life bleed: Sneak taps it before the ops resolve, so an
empty board is a clean no-op rather than self-inflicted damage. It now punishes a tapped-out board.
