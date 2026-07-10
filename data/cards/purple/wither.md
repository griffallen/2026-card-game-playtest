---
name: Wither
type: action
cost: 2
status: draft
art: /cards/wither.svg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"buff","t":"chosen0","p":-2,"dur":"perm"}]}
---
Target enemy unit gets -2 Power permanently.

## Design notes

Session 006 proposal: The signature removal: purple weakens instead of burning (red) or walling (yellow). Power floors at 0.
First sims: 1 mana was a permanent answer to any attacker — 2 respects red.
