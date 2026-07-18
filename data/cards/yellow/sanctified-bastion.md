---
name: Sanctified Bastion
type: unit
cost: 3
power: 1
health: 4
keywords: cantAttack, politician
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"statics":[{"s":"aura","scope":"friendlyInZone","armor":1}]}
---
This can't attack. Politician. Other friendly units in this zone have Armor 1.

## Design notes

Session 006: the aura is now zone-local (was board-wide — a 3-mana wall quietly armoring the whole army from home). Walls protect what stands behind them.

2026-07-12 (decision 85, issues #25/#24 — designer: "yes, push these up"): door 2 (retaliation)
became law and yellow's repair pass landed with it — guard defend-payouts up one notch (they now
trigger whether the guard blocks OR is attacked directly), wall power up one point (a wall's power
is also its retaliation now). ⚑ ratify/veto per card.

2026-07-15 (#91 balance pass — Griff: "do all the card cuts"): health 6 → 4 — the Armor-1 aura is the card; the 6-health chassis made it unremovable. At 4 it dies to Volcanic Slam + chip. Full pass: griffs-yellow 69.7% → 56.0% vs griffs-red (N=300). ⚑ ratify/veto.

2026-07-18 (#98, Griff): +Politician — more carriers so yellow can field a Neutral-zone presence (yellow-vs-red pass).
