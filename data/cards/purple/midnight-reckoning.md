---
name: Midnight Reckoning
type: action
cost: 7
pips: purple, purple, purple
status: draft
art: /cards/midnight-reckoning.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"reckoning","n":7,"influencePerKill":1,"killThreshold":7,"shortfallLife":7}]}
---
Deal 7 damage to every unit. Gain 1 Influence for each unit defeated this way. If you gained less than 7 Influence, your opponent loses 7 Life.

## Design notes

2026-07-19 (#122): reworked from a 3-damage enemy-only wipe + draw into a top-end AoE finisher. Deals 7 to EVERY unit — both sides, your own board included — and pays you 1 Influence per unit it fells (a kill is a kill, decision 74: friend and foe both count). Because each kill is worth exactly +1 Influence, "gained less than 7 Influence" is identical to "fewer than 7 units died" — a kill count the op holds inline, so the shortfall clause needs no influence-introspection, just the count.

The self-damage tension is deliberate and on-theme for purple: wiping your OWN board is part of what pushes the kill count toward 7, and reaching 7 or more kills SPARES the opponent the 7 face damage. So the more of your own units you feed to the sweep, the less it burns their Life — a real trade, not a bug.

"Loses 7 Life" is a standard ward-respecting burn (the same spell-to-face path as any other burn: it respects preventBase and does not pierce). Griff can flip it to unpreventable with a word.
