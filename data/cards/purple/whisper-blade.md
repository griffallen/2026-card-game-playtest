---
name: Whisper Blade
type: unit
cost: 1
power: 2
health: 1
influenceTrigger: onKill
pips: purple
status: draft
art: /cards/whisper-blade.svg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onKill":[{"op":"influence","n":1}]}
---
When this defeats a unit, gain 1 Influence.

## Design notes

Session 006 proposal: Purple's influence law: the track moves only on kills.
