---
name: Unwavering Faith
type: action
cost: 3
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"any"}],"onPlay":[{"op":"heal","t":"chosen0","n":3}]}
---
Heal 3 damage from target unit.

## Design notes

Session 006: became unit-only. The old targeting technically allowed healing the enemy base — the engine can't say "any unit or YOUR base" in one target, and the flexible version was dishonest text.
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): the flat 'Gain 1 Influence' rider is cut (your Iron Plating direction, applied wholesale — influence should be earned at moments, not stapled to spells; this slows yellow's influence clock directly). ⚑ ratify/veto.
