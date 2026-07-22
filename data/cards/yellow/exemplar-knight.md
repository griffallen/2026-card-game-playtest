---
name: Exemplar Knight
type: unit
cost: 4
power: 4
health: 4
influenceTrigger: onKill
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onKill":[{"op":"influence","n":1}]}
---
When this unit defeats a unit, gain 1 Hope.

## Design notes

Decision 34: influence pays on the kill, not for existing. (Session 006: fixed a copy-paste note that claimed this was an on-defend card.)

2026-07-16 (#104/#107 balance pass, phase 2 group A — Griff's ruling on the influence-trigger cards): trimmed to only the kill payout. The old on-attack "+2 Power this round" self-buff is gone — the card is now a clean 4/4 that gains 1 Influence for each unit it defeats (a trade counts).
