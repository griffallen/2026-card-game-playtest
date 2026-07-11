---
name: Containment Priest
type: unit
cost: 2
power: 2
health: 3
keywords: capture
pips: yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy","maxPower":2}],"onPlay":[{"op":"capture","t":"chosen0"}]}
---
When this enters play, it captures target enemy unit with 2 or less Power.

## Design notes

Decision 51: the pick is deterministic (strongest eligible; ties go to the earliest arrival) and the text says so. Fires on deploy and on every move.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. The priest carries its own cell now — a targeted capture on entry (was auto-imprison).
