---
name: Detain
type: action
cost: 6
influenceTrigger: onPlay
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"},{"t":"unit","side":"enemy"}],"onPlay":[{"op":"capture","t":"chosen1","by":"chosen0"},{"op":"heal","t":"selfBase","n":3},{"op":"influence","n":1}]}
---
Target unit you control captures target enemy unit. Your Home heals 3. Gain 1 Influence.

## Design notes

Session 006, prison ladder: Detain 6 = the stabilizer — lock the threat away and bind the wound it left. Was a plain imprison+1 at 6 mana, strictly worse than the cheaper rungs.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Rung 6: order restored — the arrest, the healing, the standing.
