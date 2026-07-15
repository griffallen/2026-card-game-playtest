---
name: Binding Light
type: action
cost: 2
pips: yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"modes":[{"label":"Weak","text":"Exhaust an enemy unit with 4 or less Power.","targets":[{"t":"unit","side":"enemy","maxPower":4}],"ops":[{"op":"exhaust","t":"chosen0"}]},{"label":"Cheap","text":"Exhaust an enemy unit that costs 4 or less.","targets":[{"t":"unit","side":"enemy","maxCost":4}],"ops":[{"op":"exhaust","t":"chosen0"}]},{"label":"Overwhelm","text":"Exhaust any enemy unit — requires 8 or more Influence.","cond":{"influenceAtLeast":8},"targets":[{"t":"unit","side":"enemy"}],"ops":[{"op":"exhaust","t":"chosen0"}]}]}
---
Choose one — exhaust an enemy unit with 4 or less Power; exhaust an enemy unit that costs 4 or less; or, if you have 8 or more Influence, exhaust any enemy unit.

## Design notes

Session 006, prison ladder: Binding Light 2 = midweight lockup, pure tempo (no influence rider). The old 10+ rider was dead text — prisoners already can't attack anything (decision 50 spirit).

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Rung 2: the verdict of stillness — exhaustion is the new soft lock (blocking costs ready units in v3, so this bites twice).

2026-07-15 (#87, Griff ratified — enemy-only confirmed): the single 'exhaust a ≤4-Power enemy' becomes **modal**, same cost 2 / one yellow pip. Choose one: **Weak** (exhaust an enemy with ≤4 Power — the original), **Cheap** (exhaust an enemy that costs ≤4 — a new angle: costly beaters can be low-power, cheap ones can hit hard, so the two filters catch different threats), or **Overwhelm** (exhaust ANY enemy — but only while you hold 8+ Influence, a reward for a commanding board). Two new primitives: `maxCost` on a target, and a `cond` that gates a whole mode's legality (Overwhelm isn't even offered below 8 Influence).
