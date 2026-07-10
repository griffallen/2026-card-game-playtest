---
name: Rain of Quarrels
type: action
cost: 4
status: draft
art: /cards/rain-of-quarrels.svg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"zone"}],"onPlay":[{"op":"damageFilter","f":{"side":"enemy","zone":"chosenZone"},"n":2}]}
---
Choose a zone. Deal 2 damage to every enemy unit there.

## Design notes

Session 006 proposal: Purple sweeps are precise — enemies only. Red pays for its bigger zone nuke in friendly fire.
