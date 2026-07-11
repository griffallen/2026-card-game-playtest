---
name: Pillage
type: action
cost: 2
pips: red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"upgrade","side":"enemy"}],"onPlay":[{"op":"destroyUpgrade"}]}
---
Destroy target enemy upgrade.

## Design notes

Session 006: 4 mana → 2. Utility removal was priced like a threat; yellow runs seven upgrades and red needs a real answer at a price it can pay mid-assault.
