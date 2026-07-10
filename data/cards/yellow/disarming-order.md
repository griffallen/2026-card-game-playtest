---
name: Disarming Order
type: action
cost: 4
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"grant","t":"chosen0","kw":{"k":"cantAttack"},"dur":"round"},{"op":"draw","n":1}]}
---
Target unit can't attack this round. Draw a card.

## Design notes

Session 006: 5 → 3 mana. A one-round pacify plus a card is a trick, not a threat.
