---
name: Light of Authority
type: action
cost: 4
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"buff","t":"chosen0","p":3,"dur":"round"},{"op":"grantTrigger","t":"chosen0","key":"onAttackBase","ops":[{"op":"healFromBaseDamage"}],"dur":"round"},{"op":"grantTrigger","t":"chosen0","key":"onKill","ops":[{"op":"influence","n":1}],"dur":"round"},{"op":"influence","n":3,"cond":{"influenceAtMost":-1}}]}
---
This round, target unit gets +3 Power. Whenever it deals damage to a base, gain Life equal to that damage. Whenever it defeats an opponent, gain 1 Hope. If your Hope is less than 0, gain 3 Hope.

## Design notes

Session 006: 6 → 3 mana (red's Cataclysmic Charge gives +3 AND Breakthrough 3 at 4 — yellow's pump can cost less because it converts defense, not kills).
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): the flat 'Gain 1 Influence' rider is cut (your Iron Plating direction, applied wholesale — influence should be earned at moments, not stapled to spells; this slows yellow's influence clock directly). ⚑ ratify/veto.
