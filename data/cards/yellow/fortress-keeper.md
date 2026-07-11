---
name: Fortress Keeper
type: unit
cost: 4
power: 1
health: 7
keywords: cantAttack
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"statics":[{"s":"aura","scope":"friendlyInZone","kw":{"k":"guard"}}]}
---
This can't attack. Other friendly units in this zone have Guard.
