---
name: Blood Rush
type: action
cost: 2
pips: red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"clearDamage","t":"chosen0"},{"op":"damage","t":"selfBase","n":"linked"}]}
---
Remove all damage from a unit you control; deal that much damage to your base.

## Design notes

2026-07-11 (designer, issue #4): full rework — the wound comes home. Red's healing is a
mortgage: your champion fights on, your Home bleeds for it. First linked-amount card.
