---
name: Iron Plating
type: upgrade
cost: 1
influenceTrigger: onPlay
pips: yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"statics":[{"s":"aura","scope":"attached","armor":1}],"onPlay":[{"op":"influence","n":1}]}
---
Attach to unit. This unit gets Armor 1.

## Design notes

Session 006: 2 → 1 mana. As an upgrade it can be Pillaged and feeds the upgrade-pressure rule — it should undercut the action version (Radiant Aegis).
