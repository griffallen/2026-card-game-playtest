---
name: Inquisitor
type: unit
cost: 6
power: 4
health: 5
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onEnterZone":[{"op":"imprison","t":"auto","auto":{"scope":"enteredZone"},"f":{"side":"enemy","maxPower":4}}]}
---
When this enters a zone, imprison the strongest enemy unit there with 4 or less Power.

## Design notes

Decision 51 text (deterministic pick within the power cap).
