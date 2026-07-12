---
name: Searing Bolt
type: action
cost: 1
pips: red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unitOrBase","side":"any","baseSide":"any"}],"onPlay":[{"op":"damage","t":"chosen0","n":3}]}
---
Deal 2 damage to any target.

## Design notes

2026-07-11 (designer, issue #4): 2 → 3 damage at unchanged cost 2. This runs ABOVE the
session-006 burn grammar (face-capable burn = cost) — designer's call on his ratify pass;
flagged on the thread in case cost 3 was intended.
