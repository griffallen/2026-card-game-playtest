---
name: Reckless Charge
type: action
cost: 0
pips: red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"modes":[{"label":"Charge","text":"Move one of your units one zone, even if exhausted — this doesn't exhaust it.","targets":[{"t":"unit","side":"friendly"},{"t":"zone","adjacentToFirst":true}],"ops":[{"op":"move","t":"chosen0","to":"chosenZone"}]},{"label":"Pack fury","text":"Target unit gets +1 Power this round for each other red unit in its zone (either side's).","targets":[{"t":"unit","side":"friendly"}],"ops":[{"op":"countBuff","t":"chosen0","per":{"color":"red","side":"all","zone":"ofTarget","other":true},"p":1,"dur":"round"}]}]}
---
Choose one — move one of your units one zone, even if exhausted (this doesn't exhaust it); OR target unit gets +1 Power this round for each other red unit in its zone (either side's).

## Design notes

Session 006: was "gains Rush" permanently — dead text under decision 41 (Rush only matters the round a unit enters play, so a permanent grant on a veteran does nothing, ever). Now scoped to the round: the real play is on a unit you just dropped — its first move becomes free, so it can cross a zone and still fight.

2026-07-11 (designer, PR #13 + #14): cost 1 → 0 and became modal — the second mode is the pack-fury
pump counting ALL red units in the zone, enemy red included (rage recognizes rage). First modal card
in the game; the mode is declared when you cast.

2026-07-12 (designer, issue #26 → decision 72): the round-scoped Rush grant was STILL dead on any
unit from an earlier round (the free move only exists the round a unit entered) and useless on an
exhausted unit (it can't move at all). Mode rebuilt in the designer's own words: an immediate
one-zone lunge, exhausted or not, exhausting nothing. New vocabulary: op `move` + zone target
`adjacentToFirst`. A genuinely *reckless* charge — hurl a spent soldier forward.
