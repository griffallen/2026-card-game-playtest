---
name: Justicar Enforcer
type: unit
cost: 3
power: 3
health: 4
keywords: guard
influenceTrigger: onDefend
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDefend":[{"op":"influence","n":1}]}
---
Guard. When this defends, gain 1 Influence.

## Design notes

Session 006: defend payout 2 → 1. The guard payout ladder: cheap guards (≤3) pay 1, elite guards (5+) pay 2 (Custodian of Law, Light's Vanguard).
