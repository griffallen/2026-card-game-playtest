---
name: Aura of Resolve
type: upgrade
cost: 3
influenceTrigger: onDefend
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDefend":[{"op":"influence","n":2}]}
---
Attach to unit. When this unit defends, gain 2 Influence.

## Design notes

Session 006 redesign: was "at the start of your round, gain 1 Influence" — passive income, illegal under the yellow charter (influence is event-earned, decision 34). Now it pays when the wearer defends: put it on a Guard and get paid for every intercept.

2026-07-12 (decision 85, issues #25/#24 — designer: "yes, push these up"): door 2 (retaliation)
became law and yellow's repair pass landed with it — guard defend-payouts up one notch (they now
trigger whether the guard blocks OR is attacked directly), wall power up one point (a wall's power
is also its retaliation now). ⚑ ratify/veto per card.
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): payout ladder −1 (the decision-85 raise was priced against a bot that blocked randomly; the ladder-back probe measured red 34.5→40, and under the duel law every guard is premium). ⚑ ratify/veto.
