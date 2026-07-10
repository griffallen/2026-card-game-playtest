---
name: Disarming Order
type: action
cost: 5
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"grant","t":"chosen0","kw":{"k":"cantAttack"},"dur":"round"},{"op":"draw","n":1}]}
---
Target unit can't attack this round. Draw a card.
