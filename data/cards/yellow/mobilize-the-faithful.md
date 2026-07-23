---
name: Mobilize the Faithful
type: action
cost: 6
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"buff","t":{"side":"friendly"},"p":1,"dur":"round","per":{"count":"units","f":{"side":"enemy","zone":"all"}}},{"op":"grant","t":{"side":"friendly"},"kw":{"k":"guard"},"dur":"round"}]}
---
This round, your units gain Guard and +1 Power for each enemy unit.

## Design notes

Session 006: 4 → 6 mana. A permanent board-wide pump plus mass Guard was priced like a trick; it is a haymaker (red's Warpath gives +1 for one round at 2).
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): the flat 'Gain 1 Influence' rider is cut (your Iron Plating direction, applied wholesale — influence should be earned at moments, not stapled to spells; this slows yellow's influence clock directly). ⚑ ratify/veto.
