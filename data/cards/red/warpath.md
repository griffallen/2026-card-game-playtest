---
name: Warpath
type: action
cost: 2
pips: red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"buff","t":{"side":"friendly"},"p":1,"dur":"round"}]}
---
Your units get +1 Power this round.

## Design notes

Session 006 redesign: was "all friendly units gain Rush" permanently — dead text under decision 41 (see Reckless Charge). Rebuilt as the go-wide pump: 2 mana, +1 Power to the whole board for the round. Last Stand (+2 and a blood price) is its big sibling.
