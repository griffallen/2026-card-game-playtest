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
effects: {"onDefend":[{"op":"influence","n":2}]}
---
Guard. When this defends, gain 2 Influence.

## Design notes

Session 006 balance pass: payout restored to 2 — this is yellow's dedicated influence-engine guard (the vanilla walls pay 1). Sims: without real influence payouts yellow's second win axis never fires.
