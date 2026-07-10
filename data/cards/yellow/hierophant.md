---
name: Hierophant
type: unit
cost: 6
power: 3
health: 7
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"statics":[{"s":"aura","scope":"otherFriendly","p":1,"cond":{"influenceAtLeast":10}}]}
---
Other friendly units get +1 Power while your Influence is 10 or more.

## Design notes

Session 006: 2/6 → 3/7. It paid a four-point statline tax for an aura that only works when you are already winning; now it pays two.
