---
name: Custodian of Law
type: unit
cost: 5
power: 2
health: 5
keywords: guard, tribune
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDeath":[{"op":"draw","n":1},{"op":"heal","t":"selfBase","n":3}]}
---
Guard. Tribune. When this unit dies, draw a card and gain 3 Life.

## Design notes

Decision 34: influence is earned by events, never by existing — this unit pays out when it defends (is attacked).

2026-07-12 (decision 85, issues #25/#24 — designer: "yes, push these up"): door 2 (retaliation)
became law and yellow's repair pass landed with it — guard defend-payouts up one notch (they now
trigger whether the guard blocks OR is attacked directly), wall power up one point (a wall's power
is also its retaliation now). ⚑ ratify/veto per card.
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): payout ladder −1 (the decision-85 raise was priced against a bot that blocked randomly; the ladder-back probe measured red 34.5→40, and under the duel law every guard is premium). ⚑ ratify/veto.

2026-07-15 (#91 balance pass — Griff: "do all the card cuts"): power 4 → 3 — decision-85 walk-back, same tier. Full pass: griffs-yellow 69.7% → 56.0% vs griffs-red (N=300). ⚑ ratify/veto.

2026-07-16 (#104 balance pass — Griff: "keep Guard, remove other text. Power 2, Health 5"): the on-defend +2 Influence payout is cut — the Custodian is now a plain 2/5 Guard wall, no influence engine. The stats were already 2/5 (set in the Phase 1 numbers pass), so #104's only remaining change is removing the payout: text trimmed to "Guard." and the onDefend influence effect deleted. Supersedes the decision-34 defend-payout note above; part of yellow's influence-clock slowdown across the pass. ⚑ ratify/veto.

2026-07-18 (#98, Griff): +Politician — more carriers so yellow can field a Neutral-zone presence (yellow-vs-red pass).
