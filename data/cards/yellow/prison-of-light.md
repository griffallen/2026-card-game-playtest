---
name: Prison of Light
type: action
cost: 7
pips: yellow, yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"zone"}],"onPlay":[{"op":"exhaust","t":{"side":"enemy","zone":"chosenZone"}},{"op":"influence","n":2}]}
---
Choose a zone: exhaust all enemy units there. Gain 2 Influence.

## Design notes

Session 006, prison ladder: Prison of Light 7 = the zone-wide haymaker. Remember the mortgage: every prisoner costs you 1 Influence per round, so caging an army is a serious bet.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Rung 7: the light holds a whole district still for a round — and in v3 a stilled zone cannot block.
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): the flat +2 rider is cut — under death-only capture (decision 92) and the duel law, the effect alone carries the cost. ⚑ ratify/veto.

Second thought same pass: the +2 returns — influence as a FINISHER'S reward on the 7s, not a dribble on every spell (the first sim killed the influence win entirely: 5% of games).
