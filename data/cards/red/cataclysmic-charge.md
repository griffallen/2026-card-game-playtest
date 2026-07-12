---
name: Cataclysmic Charge
type: action
cost: 4
pips: red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"buff","t":"chosen0","p":3,"dur":"round"},{"op":"grant","t":"chosen0","kw":{"k":"breakthrough"},"dur":"round"}]}
---
Target unit gets +3 Power and Breakthrough this round.

## Design notes

Session 006 redesign: was 6 mana for +3 Power and Rush this round — overcosted (Blood Rush gives +2 and Rush for 2) and the Rush rider was near-dead text on veterans. Now the single-target alpha strike: the Breakthrough rider makes the pump land on the base, not just the wall.
