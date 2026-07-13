---
name: Vanguard Sentinel
type: unit
cost: 1
power: 1
health: 1
keywords: guard
influenceTrigger: onDeath
pips: yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDeath":[{"op":"influence","n":1}]}
---
Guard. When this unit dies, gain 1 Influence.

## Design notes

Decision 34: influence is earned by events, never by existing — this unit pays out when it defends (is attacked).

2026-07-12 (decision 85, issues #25/#24 — designer: "yes, push these up"): door 2 (retaliation)
became law and yellow's repair pass landed with it — guard defend-payouts up one notch (they now
trigger whether the guard blocks OR is attacked directly), wall power up one point (a wall's power
is also its retaliation now). ⚑ ratify/veto per card.

2026-07-13 (designer, PR #54 — yellow rebalance pass, issue #50): 1/2 → 1/1, and the defend
payout becomes a death payout — "When this unit dies, gain 1 Influence." New vocabulary:
`onDeath` trigger (fires as the unit falls, its owner collects). The martyr, not the sentry.
