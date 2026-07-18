---
name: Fortress Keeper
type: unit
cost: 4
power: 2
health: 3
keywords: cantAttack, politician
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"statics":[{"s":"aura","scope":"friendlyInZone","kw":{"k":"guard"}}]}
---
This can't attack. Politician. Other friendly units in this zone have Guard.
## Design notes

2026-07-12 (decision 85, issues #25/#24 — designer: "yes, push these up"): door 2 (retaliation)
became law and yellow's repair pass landed with it — guard defend-payouts up one notch (they now
trigger whether the guard blocks OR is attacked directly), wall power up one point (a wall's power
is also its retaliation now). ⚑ ratify/veto per card.

2026-07-15 (#91 balance pass — Griff: "do all the card cuts"): health 7 → 5 — the Guard aura stays; at 5 one Inferno Titan swing answers it, where at 7 nothing red runs did. Full pass: griffs-yellow 69.7% → 56.0% vs griffs-red (N=300). ⚑ ratify/veto.

2026-07-18 (#98, Griff): +Politician — more carriers so yellow can field a Neutral-zone presence (yellow-vs-red pass).
