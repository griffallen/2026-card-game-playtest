---
name: Imprisonment Chamber
type: action
cost: 6
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"},{"t":"unit","side":"enemy"}],"onPlay":[{"op":"capture","t":"chosen1","by":"chosen0"}]}
---
Target unit you control captures target enemy unit.

## Design notes

Session 006, prison ladder: Chamber 5 = the political win — imprison plus the pool's biggest single influence payout. The old text restated the global decay rule (§1.11) as if it were a card effect; the ledger stopped lying.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Rung 5: the chamber — capture as civic spectacle.
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): the flat +2 rider is cut — under death-only capture (decision 92) and the duel law, the effect alone carries the cost. ⚑ ratify/veto.

2026-07-15 (#91 balance pass — Griff: "do all the card cuts"): cost 5 → 6 — capture-anything is permanent removal while the warden stands; one rung up the ladder (Sentence/Detain move in step). Full pass: griffs-yellow 69.7% → 56.0% vs griffs-red (N=300). ⚑ ratify/veto.
