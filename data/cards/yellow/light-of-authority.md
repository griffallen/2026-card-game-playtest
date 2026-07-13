---
name: Light of Authority
type: action
cost: 4
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"buff","t":"chosen0","p":3,"dur":"round"}]}
---
Target unit gets +3 Power this round.

## Design notes

Session 006: 6 → 3 mana (red's Cataclysmic Charge gives +3 AND Breakthrough 3 at 4 — yellow's pump can cost less because it converts defense, not kills).
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): the flat 'Gain 1 Influence' rider is cut (your Iron Plating direction, applied wholesale — influence should be earned at moments, not stapled to spells; this slows yellow's influence clock directly). ⚑ ratify/veto.
