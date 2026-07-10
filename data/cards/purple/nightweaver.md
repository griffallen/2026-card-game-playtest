---
name: Nightweaver
type: unit
cost: 3
power: 3
health: 3
status: draft
art: /cards/nightweaver.svg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"buff","t":"chosen0","p":-1,"dur":"perm"}]}
---
When this enters play, target enemy unit gets -1 Power permanently.
