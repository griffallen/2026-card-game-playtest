---
name: Devastating Strike
type: action
cost: 1
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"any"}],"onPlay":[{"op":"damage","t":"chosen0","n":2}]}
---
Deal 2 damage to target unit.

## Design notes

Session 006: became unit-only. Red's burn grammar — unit-only burn deals cost+1, face-capable burn deals exactly cost (the reach is the tax). This is the efficient unit-killer; Searing Bolt is the flexible one.
