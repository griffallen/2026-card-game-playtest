---
name: Crippling Dart
type: action
cost: 2
pips: purple
status: canon
art: /cards/crippling-dart.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"damage","t":"chosen0","n":2},{"op":"buff","t":"chosen0","p":-1,"dur":"perm"}]}
---
Deal 2 damage to target enemy unit. It gets -1 Power permanently.
