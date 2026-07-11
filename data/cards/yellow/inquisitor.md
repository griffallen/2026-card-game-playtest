---
name: Inquisitor
type: unit
cost: 6
power: 4
health: 5
keywords: capture
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy","maxPower":4}],"onPlay":[{"op":"capture","t":"chosen0"}]}
---
When this enters play, it captures target enemy unit with 4 or less Power.

## Design notes

Decision 51 text (deterministic pick within the power cap).

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. The senior arrest: bigger writ, bigger body.
