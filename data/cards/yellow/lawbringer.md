---
name: Lawbringer
type: unit
cost: 4
power: 2
health: 3
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onEnterZone":[{"op":"exhaust","t":"chosen0"}]}
---
Whenever this enters a zone, exhaust target enemy unit.

## Design notes

Decision 51 text. Containment Priest's big sibling: full statline plus the same arrest, two mana later.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. The law arrives and the room goes quiet — repeatable discipline on every march.
