---
name: Blackout
type: action
cost: 4
pips: purple, purple
status: draft
art: /cards/blackout.svg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"zone"}],"onPlay":[{"op":"grant","t":{"side":"enemy","zone":"chosenZone"},"kw":{"k":"cantAttack"},"dur":"round"}]}
---
Choose a zone. Enemy units there can't attack this round.
