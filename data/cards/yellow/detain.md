---
name: Detain
type: action
cost: 6
influenceTrigger: onPlay
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"imprison","t":"chosen0"},{"op":"heal","t":"selfBase","n":3},{"op":"influence","n":1}]}
---
Imprison target unit. Heal 3 damage from your base. Gain 1 Influence.

## Design notes

Session 006, prison ladder: Detain 6 = the stabilizer — lock the threat away and bind the wound it left. Was a plain imprison+1 at 6 mana, strictly worse than the cheaper rungs.
