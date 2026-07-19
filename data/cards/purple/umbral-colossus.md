---
name: Umbral Colossus
type: unit
cost: 6
keywords: infiltrate
pips: purple, purple
status: draft
art: /cards/umbral-colossus.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"powerFromCount":"handSize","healthFromCount":"handSize"}
---
Infiltrate. Power and Health each equal the number of cards in your hand.

## Design notes

2026-07-11 (v3 churn pass 2): the colossus began as a ghost-fortress — Hidden while ready, Shielded to shrug the first blow. A 6-cost that does a lot (decision 68).

2026-07-19 (#122): reworked into a living fortress the size of your grip on the game. Dropped Hidden and Shielded; kept Infiltrate (march into any zone). Power AND Health now each equal the number of cards in your hand — read live, so it looms huge on a full hand and withers as you spend down; play your hand out under its wounds and it dies. New engine primitive powerFromCount/healthFromCount ('handSize'): the count REPLACES the printed base stat in effPower/effHealth, and mods/auras compose on top. The printed power/health lines are dropped — the count governs. Cast as your LAST card it enters 0/0 (the hand is emptied first) and dies on entry: intended, on-theme.
