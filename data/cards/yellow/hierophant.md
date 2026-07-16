---
name: Hierophant
type: unit
cost: 6
power: 1
health: 6
keywords: politician
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"statics":[{"s":"aura","scope":"otherFriendly","p":1,"cond":{"influenceAtLeast":1}}]}
---
Politician. Other friendly units get +1 Power while your Influence is positive.

## Design notes

Session 006: 2/6 → 3/7. It paid a four-point statline tax for an aura that only works when you are already winning; now it pays two.


2026-07-12 (decision 88, issue #29 — agent pick ⚑ ratify/veto): first Politician carrier.
At round end, a Politician standing in Neutral whose owner holds the majority there sways the
track (+1 influence, once per round). The middle finally has a constituency.
