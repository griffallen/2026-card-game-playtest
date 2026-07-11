---
name: Prison Warrant
type: action
cost: 1
influenceTrigger: onPlay
pips: yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy","maxPower":2}],"onPlay":[{"op":"imprison","t":"chosen0"},{"op":"influence","n":1}]}
---
Imprison target enemy unit with 2 or less Power. Gain 1 Influence.

## Design notes

Session 006, the prison ladder (each imprison action now has one job): Warrant 1 = small fry. The old "in this zone" was meaningless from hand (decision 52 context) and an unrestricted 1-mana imprison embarrassed Detain at 6.
