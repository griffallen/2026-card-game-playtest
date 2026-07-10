---
name: Sanctify
type: action
cost: 4
influenceTrigger: onPlay
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"heal","t":"selfBase","n":4},{"op":"influence","n":1}]}
---
Heal 4 damage from your base. Gain 1 Influence.

## Design notes

Session 006: 6 → 4 mana, influence 2 → 1 (life-gain shouldn't also be the biggest influence payout — that belongs to the prison ladder's Chamber).
