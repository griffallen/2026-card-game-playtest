---
name: Containment Priest
type: unit
cost: 2
power: 2
health: 2
keywords: capture
pips: yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"modes":[{"label":"Capture","targets":[{"t":"unit","side":"enemy","maxPower":2}],"ops":[{"op":"capture","t":"chosen0"}]},{"label":"Stand down","targets":[{"t":"unit","side":"enemy","mustBeDamaged":true}],"ops":[{"op":"exhaust","t":"chosen0"}]}]}
---
When this enters play, choose one: capture target enemy unit with 2 or less Power, or exhaust a damaged enemy unit.

## Design notes

Decision 51: the pick is deterministic (strongest eligible; ties go to the earliest arrival) and the text says so. Fires on deploy and on every move.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. The priest carries its own cell now — a targeted capture on entry (was auto-imprison).

2026-07-14 (PR #75, Griff — "little balancing"): the priest becomes modal — on entry, choose to capture a small (≤2 power) enemy OR stand a *damaged* enemy down (exhaust it). Uses the existing `mustBeDamaged` target and the game's first modal UNIT (the mode's ops now run on a unit's entry, mirroring modal actions). Body trimmed 2/3 → 2/2. ⚑ ratify/veto — flagging that "a unit that is damaged" is read as an *enemy* damaged unit (exhausting your own makes no sense).
