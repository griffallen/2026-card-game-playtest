---
name: Smash Through
type: action
cost: 0
pips: red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"modes":[{"label":"Blood price","targets":[{"t":"unit","side":"friendly","withKw":"rush"}],"ops":[{"op":"grant","t":"chosen0","kw":{"k":"breakthrough"},"dur":"round"},{"op":"damage","t":"selfBase","n":3}]},{"label":"Sacrifice","targets":[{"t":"unit","side":"friendly","withKw":"rush"},{"t":"unit","side":"friendly"}],"ops":[{"op":"grant","t":"chosen0","kw":{"k":"breakthrough"},"dur":"round"},{"op":"damage","t":"chosen1","n":3}]}]}
---
Target unit with Rush gains Breakthrough this round. Choose one — lose 3 Life; or deal 3 damage to another unit you control.
