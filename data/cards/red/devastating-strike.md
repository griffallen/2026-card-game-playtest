---
name: Devastating Strike
type: action
cost: 1
pips: red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"any"}],"onPlay":[{"op":"damage","t":"chosen0","n":2,"bonusIfDamaged":1}]}
---
Deal 2 damage to target unit — 3 instead if it's already damaged.

## Design notes

Session 006: became unit-only. Red's burn grammar — unit-only burn deals cost+1, face-capable burn deals exactly cost (the reach is the tax). This is the efficient unit-killer; Searing Bolt is the flexible one.

2026-07-11 (designer, issue #4): finish-the-wounded clause added (2, or 3 to a damaged unit) —
first conditional-bonus card. Pairs with red's chip damage; the executioner rewards setup.
