---
name: Pacify
type: action
cost: 2
status: draft
art: /cards/pacify.svg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"grant","t":"chosen0","kw":{"k":"cantAttack"},"dur":"round"}]}
---
Target enemy unit can't attack this round.
