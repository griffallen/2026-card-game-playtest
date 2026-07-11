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
effects: {"onAttack":[{"op":"buff","t":"self","p":2,"dur":"round"}],"onKill":[{"op":"influence","n":1}]}
---
When this attacks, it gets +2 Power this round. When it defeats a unit, gain 1 Influence.

## Design notes

Decision 34: influence pays on the kill, not for existing. (Session 006: fixed a copy-paste note that claimed this was an on-defend card.)
