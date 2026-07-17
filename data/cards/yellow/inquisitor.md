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
effects: {"targets":[{"t":"unit","side":"enemy","anyOf":{"maxPower":4,"maxCost":4,"maxRemainingHealth":4}}],"onPlay":[{"op":"capture","t":"chosen0"}]}
---
When this enters play, it captures target enemy unit with 4 or less Power, Cost, or remaining Health.

## Design notes

Decision 51 text (deterministic pick within the power cap).

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. The senior arrest: bigger writ, bigger body.

2026-07-15 (#91 balance pass — Griff: "do all the card cuts"): power 4 → 3, health 5 → 4 — Archon paid for its writ with its body last pass; the junior writ matches. Capture cap untouched. Full pass: griffs-yellow 69.7% → 56.0% vs griffs-red (N=300). ⚑ ratify/veto.

2026-07-16 (#104, Griff's locked spec): the writ widens. Capture now reaches any enemy unit with 4 or less Power, Cost, OR remaining Health — any one of the three qualifies. A big, expensive body that's been worn down to 4 remaining Health is now arrestable, as is a cheap high-power unit. Needed a new target predicate: `anyOf` on the target spec — an OR of maxPower/maxCost/maxRemainingHealth, ANDed with the enemy-side constraint. Enforced in both the legal-target enumeration and the play-time validation.
