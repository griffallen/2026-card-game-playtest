---
name: Prison of Light
type: action
cost: 7
pips: yellow, yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"zone"}],"onPlay":[{"op":"exhaust","t":{"side":"enemy","zone":"chosenZone"}},{"op":"influence","n":1,"per":{"count":"units","f":{"side":"enemy","zone":"chosenZone"}}},{"op":"heal","t":"selfBase","n":2}]}
---
Choose a zone: exhaust all enemy units there. Gain 1 Hope for each enemy unit exhausted, and gain 2 Life.

## Design notes

Session 006, prison ladder: Prison of Light 7 = the zone-wide haymaker. Remember the mortgage: every prisoner costs you 1 Influence per round, so caging an army is a serious bet.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Rung 7: the light holds a whole district still for a round — and in v3 a stilled zone cannot block.
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): the flat +2 rider is cut — under death-only capture (decision 92) and the duel law, the effect alone carries the cost. ⚑ ratify/veto.

Second thought same pass: the +2 returns — influence as a FINISHER'S reward on the 7s, not a dribble on every spell (the first sim killed the influence win entirely: 5% of games).

2026-07-13 (PR #71, Griff confirmed the count version — supersedes the flat +2 above): the payoff now scales with the district it stills — +1 Influence per enemy exhausted, +1 Life per friendly standing there (new `per:{count:'units'}` op modifier). Bigger the trap, bigger the reward. The heal can now push you PAST starting life (decision 104 — no life cap). ⚑ ratify/veto.

2026-07-15 (#91 balance pass — Griff: "do all the card cuts"): the per-friendly heal flattens to a flat 2 Life; the influence-per-enemy scaling (your #71 design) stays whole. The per-friendly axis double-paid the wall deck for owning the district, uncapped since decision 104. PARTIALLY AMENDS #71 — flagged for veto by name. Full pass: griffs-yellow 69.7% → 56.0% vs griffs-red (N=300). ⚑ ratify/veto.
