---
name: Archon of Order
type: unit
cost: 7
power: 7
health: 7
keywords: capture
pips: yellow, yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"capture","t":"chosen0"},{"op":"influence","n":2}]}
---
When this enters play, it captures target enemy unit. Gain 2 Influence.

## Design notes

Decision 51 text (deterministic pick per zone; zones with no eligible enemies are skipped). The mass-jailer — remember each prisoner costs 1 Influence per round.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. The 7-cost does a lot (decision 68): a 7/7 that arrests anyone on arrival, publicly.
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): the flat +2 rider is cut — under death-only capture (decision 92) and the duel law, the effect alone carries the cost. ⚑ ratify/veto.

Second thought same pass: the +2 returns — influence as a FINISHER'S reward on the 7s, not a dribble on every spell (the first sim killed the influence win entirely: 5% of games).
