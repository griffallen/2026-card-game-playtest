---
name: Light's Vanguard
type: unit
cost: 8
power: 4
health: 8
keywords: guard, shielded
influenceTrigger: onDefend
pips: yellow, yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDefend":[{"op":"influence","n":1,"per":{"count":"attackers"}}]}
---
Guard. Shielded. For each unit that attacks this unit, gain 1 Hope.

## Design notes

Flying is canon (decision 48): may move to any zone, ignoring adjacency.

2026-07-11 (v3 churn pass 4): flying is cut — the Vanguard lands and becomes the great shield: 7/8 Guard (free blocks in v3), Armor 1, Shielded, and the court pays 2 when it holds the line. An 8-cost that does a lot (decision 68).

2026-07-12 (decision 85, issues #25/#24 — designer: "yes, push these up"): door 2 (retaliation)
became law and yellow's repair pass landed with it — guard defend-payouts up one notch (they now
trigger whether the guard blocks OR is attacked directly), wall power up one point (a wall's power
is also its retaliation now). ⚑ ratify/veto per card.
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): payout ladder −1 (the decision-85 raise was priced against a bot that blocked randomly; the ladder-back probe measured red 34.5→40, and under the duel law every guard is premium). ⚑ ratify/veto.
2026-07-13 (PR #70, designer: "Yes, I'd like it to count attackers"): power 7→4, Armor 1 dropped, and the flat +2 becomes +1 PER attacker (new `per:{count:'attackers'}` op modifier). A lone attacker pays 1; a gang pays its size. ⚑ ratify note: a self-blocking Vanguard counts EVERY attacker facing it, not just the one it blocks (decision 86 — it fires only once).
