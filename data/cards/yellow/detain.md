---
name: Detain
type: action
cost: 3
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"},{"t":"zone","differentFromFirst":true}],"onPlay":[{"op":"move","t":"chosen0","to":"chosenZone"}]}
---
Move target enemy unit to another zone.

## Design notes

Session 006, prison ladder: Detain 6 = the stabilizer — lock the threat away and bind the wound it left. Was a plain imprison+1 at 6 mana, strictly worse than the cheaper rungs.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Rung 6: order restored — the arrest, the healing, the standing.
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): the flat 'Gain 1 Influence' rider is cut (your Iron Plating direction, applied wholesale — influence should be earned at moments, not stapled to spells; this slows yellow's influence clock directly). ⚑ ratify/veto.

2026-07-15 (#91 balance pass — Griff: "do all the card cuts"): cost 6 → 7 — moves in step with Imprisonment Chamber; Chamber+heal spacing preserved. Full pass: griffs-yellow 69.7% → 56.0% vs griffs-red (N=300). ⚑ ratify/veto.
