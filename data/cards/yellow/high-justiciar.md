---
name: High Justiciar
type: unit
cost: 4
power: 1
health: 4
keywords: guard
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onKill":[{"op":"influence","n":1}]}
---
Guard. When this unit defeats a unit, gain 1 Influence.

## Design notes

Decision 51 text (deterministic pick, stated on the card).

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Guard is free blocking in v3 — the Justiciar holds the line and the court pays it.

2026-07-12 (decision 85, issues #25/#24 — designer: "yes, push these up"): door 2 (retaliation)
became law and yellow's repair pass landed with it — guard defend-payouts up one notch (they now
trigger whether the guard blocks OR is attacked directly), wall power up one point (a wall's power
is also its retaliation now). ⚑ ratify/veto per card.
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): payout ladder −1 (the decision-85 raise was priced against a bot that blocked randomly; the ladder-back probe measured red 34.5→40, and under the duel law every guard is premium). ⚑ ratify/veto.

2026-07-15 (#91 balance pass — Griff: "do all the card cuts"): power 3 → 2 — decision-85 walk-back, same tier. Full pass: griffs-yellow 69.7% → 56.0% vs griffs-red (N=300). ⚑ ratify/veto.

2026-07-16 (#104/#107 balance pass, phase 2 group A — Griff's ruling on the influence-trigger cards): the payout moves off defence and onto the kill. It keeps Guard, but the old "gain 2 when it defends" is replaced by "gain 1 when it defeats a unit" (a trade counts). Its Phase 1 body is 1/4 — the wall now pays only when it strikes something down. Griff's justification (#107, 2026-07-16): on-defend is too easy on a Guard (akin to a red card that hits Home on any attack); the card is meant to hold the line with Guard, and the +1 is a rare bonus IF it kills — so the magnitude drops to 1.
