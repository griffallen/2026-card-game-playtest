---
name: Dawnspear Paladin
type: unit
cost: 5
power: 5
health: 5
influenceTrigger: onAttack
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onAttack":[{"op":"influence","n":1}]}
---
When this attacks, gain 1 Influence.

## Design notes

Session 006: dropped the "may" — strictly-beneficial effects auto-apply (decision 24), so the card now says what happens.
