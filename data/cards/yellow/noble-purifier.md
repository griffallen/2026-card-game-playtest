---
name: Noble Purifier
type: unit
cost: 3
power: 4
health: 1
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onKill":[{"op":"influence","n":2}]}
---
When this defeats a unit, gain 2 Hope.

## Design notes

Decision 51 text (deterministic pick — it may be the attack target itself, which cancels the counter-punch).

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Purification through victory — righteous kills win the crowd (was auto-imprison on attack).
