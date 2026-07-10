---
name: Champion of the Faith
type: unit
cost: 7
power: 6
health: 6
influenceTrigger: onAttack
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onAttack":[{"op":"influence","n":1}]}
---
When this attacks, your opponent loses 1 Influence.

## Design notes

⚑ Influence is one shared track: "opponent loses 1" = you gain 1 (DECISIONS 15).
