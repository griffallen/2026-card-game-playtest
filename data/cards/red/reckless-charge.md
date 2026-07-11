---
name: Reckless Charge
type: action
cost: 0
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"modes":[{"label":"Rush","targets":[{"t":"unit","side":"friendly"}],"ops":[{"op":"grant","t":"chosen0","kw":{"k":"rush"},"dur":"round"}]},{"label":"Pack fury","targets":[{"t":"unit","side":"friendly"}],"ops":[{"op":"countBuff","t":"chosen0","per":{"color":"red","side":"all","zone":"ofTarget","other":true},"p":1,"dur":"round"}]}]}
---
Choose one — target unit gains Rush this round; OR target unit gets +1 Power this round for each other red unit in its zone (either side's).

## Design notes

Session 006: was "gains Rush" permanently — dead text under decision 41 (Rush only matters the round a unit enters play, so a permanent grant on a veteran does nothing, ever). Now scoped to the round: the real play is on a unit you just dropped — its first move becomes free, so it can cross a zone and still fight.

2026-07-11 (designer, PR #13 + #14): cost 1 → 0 and became modal — the second mode is the pack-fury
pump counting ALL red units in the zone, enemy red included (rage recognizes rage). First modal card
in the game; the mode is declared when you cast.
