---
name: Reckless Charge
type: action
cost: 1
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"grant","t":"chosen0","kw":{"k":"rush"},"dur":"round"}]}
---
Target unit gains Rush this round.

## Design notes

Session 006: was "gains Rush" permanently — dead text under decision 41 (Rush only matters the round a unit enters play, so a permanent grant on a veteran does nothing, ever). Now scoped to the round: the real play is on a unit you just dropped — its first move becomes free, so it can cross a zone and still fight.
