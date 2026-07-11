---
name: Sanctified Bastion
type: unit
cost: 3
power: 0
health: 6
keywords: cantAttack
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"statics":[{"s":"aura","scope":"friendlyInZone","armor":1}]}
---
This can't attack. Other friendly units in this zone have Armor 1.

## Design notes

Session 006: the aura is now zone-local (was board-wide — a 3-mana wall quietly armoring the whole army from home). Walls protect what stands behind them.
