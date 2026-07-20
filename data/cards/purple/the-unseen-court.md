---
name: The Unseen Court
type: unit
cost: 8
health: 8
keywords: hidden
pips: purple, purple, purple
status: canon
art: /cards/the-unseen-court.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"powerFromCount":"discardUnitsBoth"}
---
Hidden. Power equals the number of unit cards in all discard piles. Health 8.

## Design notes

2026-07-12 (decision 80, issue #24 Q9): Ranged reborn as an ability; this card re-identified ranged → Hidden — the court is unseen, as the name always claimed.

2026-07-19 (#122): reworked into a graveyard-scaling wall. Drops its interim Sneak entirely; now a Hidden 0/8 body whose Power equals the number of unit cards across BOTH discard piles — read live, so the court looms larger the longer the game grinds and units fall. Health stays a printed 8. New engine primitive powerFromCount ('discardUnitsBoth'): the count REPLACES the printed base Power in effPower (mods/auras compose on top). The printed power line is dropped — the count governs; the exhausted-count PerCounts from the old Sneak are retired from this card.
