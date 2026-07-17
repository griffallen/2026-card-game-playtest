---
name: Lawbringer
type: unit
cost: 4
power: 2
health: 3
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onEnterZone":[{"op":"exhaust","t":"auto","auto":{"scope":"enteredZone","choose":true}}]}
---
Whenever this enters a zone, exhaust an enemy unit of your choice in the same zone.

## Design notes

Decision 51 text. Containment Priest's big sibling: full statline plus the same arrest, two mana later.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. The law arrives and the room goes quiet — repeatable discipline on every march.

2026-07-16 (#104, Griff): "I want a choice of which enemy — a decision box like Capture." The arrest is now a player CHOICE, not the deterministic strongest-ready auto-pick. On entry (play OR march) the controller picks which eligible enemy in the entered zone to stand down. Needed a new engine seam: `auto.choose` on the exhaust op, an optional `exhaust` target on the play AND move actions (the move now carries a chosen enemy), and shared eligibility (`entryExhaustTargets`) enumerated in legal.ts + validated in engine.ts. Still mandatory when an enemy is available — you choose WHICH, not WHETHER — and still restricted to the current zone (ready, non-imprisoned, non-hidden/untargetable enemies).
