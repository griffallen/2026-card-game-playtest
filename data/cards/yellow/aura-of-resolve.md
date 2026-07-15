---
name: Aura of Resolve
type: action
cost: 0
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"heal","t":"selfBase","n":2,"per":{"count":"deathsThisRound","side":"friendly"}},{"op":"damage","t":"enemyBase","n":2,"per":{"count":"deathsThisRound","side":"enemy"}}]}
---
For each friendly unit that has died or dies this round, gain 2 Life. For each enemy unit that has died or dies this round, your opponent loses 2 Life.

## Design notes

Session 006 redesign: was "at the start of your round, gain 1 Influence" — passive income, illegal under the yellow charter (influence is event-earned, decision 34). Now it pays when the wearer defends: put it on a Guard and get paid for every intercept.

2026-07-15 (#85, Griff ratified): rebuilt from an upgrade into a **cost-0 action** that reads the day's toll. It retroactively counts every death so far this round — 2 Life to you per friendly fallen, 2 Life off the opponent per enemy fallen. Griff asked for the count to be a **reusable primitive**: a per-round death ledger now lives on the board, incremented (by owner side) at the single choke point every death flows through, cleared each round boundary — created copies that vanish (decision #69) count as deaths too. The card exposes it via a new `deathsThisRound` per-count source on the heal/damage ops (heal is uncapped, decision 104; the life-loss is ordinary base damage, respecting prevention).
