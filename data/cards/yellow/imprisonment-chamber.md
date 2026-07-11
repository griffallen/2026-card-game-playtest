---
name: Imprisonment Chamber
type: action
cost: 5
influenceTrigger: onPlay
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"},{"t":"unit","side":"enemy"}],"onPlay":[{"op":"capture","t":"chosen1","by":"chosen0"},{"op":"influence","n":2}]}
---
Target unit you control captures target enemy unit. Gain 2 Influence.

## Design notes

Session 006, prison ladder: Chamber 5 = the political win — imprison plus the pool's biggest single influence payout. The old text restated the global decay rule (§1.11) as if it were a card effect; the ledger stopped lying.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Rung 5: the chamber — capture as civic spectacle.
