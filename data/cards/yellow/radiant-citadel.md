---
name: Radiant Citadel
type: unit
cost: 7
power: 0
health: 8
keywords: cantAttack
pips: yellow, yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"statics":[{"s":"oppThreshold","n":2}]}
---
This can't attack. While this is in play, your opponent's Influence win threshold is increased by 2.

## Design notes

Decision 49: the card now says exactly what the static does (the old "maximum Influence" text meant nothing on a shared track).
