---
name: Imprisonment Chamber
type: action
cost: 5
influenceTrigger: onPlay
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"imprison","t":"chosen0"},{"op":"influence","n":2}]}
---
Imprison target unit. Gain 2 Influence.

## Design notes

Session 006, prison ladder: Chamber 5 = the political win — imprison plus the pool's biggest single influence payout. The old text restated the global decay rule (§1.11) as if it were a card effect; the ledger stopped lying.
