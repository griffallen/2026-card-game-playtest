---
name: Sanctify
type: action
cost: 5
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"grant","t":{"side":"friendly"},"kw":{"k":"tribune"},"dur":"round"},{"op":"clearDamage","t":"chosen0"}]}
---
This round, your units gain Tribune. Heal all damage on one friendly unit.

## Design notes

Session 006: 6 → 4 mana, influence 2 → 1 (life-gain shouldn't also be the biggest influence payout — that belongs to the prison ladder's Chamber).
