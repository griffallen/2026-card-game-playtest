---
name: Blood Rush
type: action
cost: 2
pips: red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"modes":[{"label":"Take the wound","targets":[{"t":"unit","side":"friendly"}],"ops":[{"op":"clearDamage","t":"chosen0"},{"op":"damage","t":"selfBase","n":"linked"}]},{"label":"Spread the wound","targets":[{"t":"unit","side":"friendly"},{"t":"unit","side":"any"}],"ops":[{"op":"clearDamage","t":"chosen0"},{"op":"damage","t":"selfBase","n":"linked"},{"op":"damage","t":"chosen1","n":"linked"}]}]}
---
Remove all damage from a unit you control; deal that much damage to your base. You may also deal that much damage to another unit.

## Design notes

2026-07-11 (designer, issue #4): full rework — the wound comes home. Red's healing is a
mortgage: your champion fights on, your Home bleeds for it. First linked-amount card.
