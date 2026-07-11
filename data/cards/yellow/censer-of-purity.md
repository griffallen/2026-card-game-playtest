---
name: Censer of Purity
type: unit
cost: 5
power: 3
health: 6
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"startOfRound":{"ops":[{"op":"influence","n":-1},{"op":"heal","t":"selfBase","n":2}]}}
---
At the start of your round, lose 1 Influence and heal 2 damage from your base.

## Design notes

Charter-legal: this is influence *spent*, not earned — trading the track for life. Session 006: text made unconditional to match the effects (the old "if you do" implied a choice that never existed).
