---
name: Sanctified Bastion
type: unit
cost: 3
power: 1
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

2026-07-12 (decision 85, issues #25/#24 — designer: "yes, push these up"): door 2 (retaliation)
became law and yellow's repair pass landed with it — guard defend-payouts up one notch (they now
trigger whether the guard blocks OR is attacked directly), wall power up one point (a wall's power
is also its retaliation now). ⚑ ratify/veto per card.
