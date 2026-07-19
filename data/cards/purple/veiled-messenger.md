---
name: Veiled Messenger
type: unit
cost: 2
power: 1
health: 3
keywords: politician
pips: purple
status: draft
art: /cards/veiled-messenger.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"draw","n":1}]}
---
Politician. When this enters play, draw a card.

## Design notes

2026-07-12 (decision 88, issue #29 — agent pick ⚑ ratify/veto): first Politician carrier.
At round end, a Politician standing in Neutral whose owner holds the majority there sways the
track (+1 influence, once per round). The middle finally has a constituency.
