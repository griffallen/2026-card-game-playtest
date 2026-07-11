---
name: Unwavering Faith
type: action
cost: 3
influenceTrigger: onPlay
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"any"}],"onPlay":[{"op":"heal","t":"chosen0","n":3},{"op":"influence","n":1}]}
---
Heal 3 damage from target unit. Gain 1 Influence.

## Design notes

Session 006: became unit-only. The old targeting technically allowed healing the enemy base — the engine can't say "any unit or YOUR base" in one target, and the flexible version was dishonest text.
