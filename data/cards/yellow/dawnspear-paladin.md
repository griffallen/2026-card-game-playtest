---
name: Dawnspear Paladin
type: unit
cost: 5
power: 5
health: 5
influenceTrigger: onAttack
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onAttack":[{"op":"influence","n":1}]}
---
When this attacks, you may gain 1 Influence.

## Design notes

⚑ The "may" auto-applies (DECISIONS 24).
