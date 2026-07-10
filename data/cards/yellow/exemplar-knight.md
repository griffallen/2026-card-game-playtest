---
name: Exemplar Knight
type: unit
cost: 4
power: 4
health: 4
influenceTrigger: onKill
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onAttack":[{"op":"buff","t":"self","p":2,"dur":"round"}],"onKill":[{"op":"influence","n":1}]}
---
When this attacks, give it +2 Power this round. When it defeats a unit, gain 1 Influence.

## Design notes

Decision 34: influence is earned by events, never by existing — this unit pays out when it defends (is attacked).
