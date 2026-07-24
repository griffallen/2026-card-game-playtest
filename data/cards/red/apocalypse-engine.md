---
name: Apocalypse Engine
type: unit
cost: 7
power: 8
health: 7
keywords: breakthrough, sneak
pips: red, red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"sneak":{"targets":[{"t":"unit","side":"any"}],"ops":[{"op":"damage","t":"selfBase","n":1,"per":{"count":"declaredX"}},{"op":"damage","t":"self","n":1,"per":{"count":"declaredX"}},{"op":"damage","t":"chosen0","n":1,"per":{"count":"declaredX"}}]}}
---
Breakthrough. Sneak — Choose X up to this unit's remaining Health. Lose X Life and deal X damage to this unit and another unit in its zone.

## Design notes

2026-07-11 (v3 churn pass 1): Overextend is cut (#9); stays the pure breakthrough bomb; 7/7 becomes 8/7 (decision-68 curve).
