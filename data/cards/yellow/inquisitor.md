---
name: Inquisitor
type: unit
cost: 6
power: 3
health: 4
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

2026-07-15 (#91 balance pass — Griff: "do all the card cuts"): power 4 → 3, health 5 → 4 — Archon paid for its writ with its body last pass; the junior writ matches. Capture cap untouched. Full pass: griffs-yellow 69.7% → 56.0% vs griffs-red (N=300). ⚑ ratify/veto.
