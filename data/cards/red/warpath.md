---
name: Warpath
type: action
cost: 0
pips: red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"buff","t":{"side":"friendly"},"p":1,"dur":"round","per":{"count":"influence","half":true}},{"op":"damage","t":"selfBase","n":1,"per":{"count":"influence"},"cond":{"influenceAtLeast":1}},{"op":"influence","n":-1,"cond":{"influenceAtMost":-1}}]}
---
X is your current Hope. Each of your units gets +Power this round equal to half of X, rounded down. If X is positive, you lose X life. If X is negative, your opponent gains 1 Hope. At 0 Hope, nothing happens.

## Design notes

Session 006 redesign: was "all friendly units gain Rush" permanently — dead text under decision 41 (see Reckless Charge). Rebuilt as the go-wide pump: 2 mana, +1 Power to the whole board for the round. Last Stand (+2 and a blood price) is its big sibling.

2026-07-16 (#107 balance pass — Griff's red influence-economy rework, locked in session 013): Warpath now spends the Influence track as fuel. Cost 2 → 0. The board pump scales to HALF your Influence magnitude, rounded down (+3 to the whole board at Influence 6), and the price flips with the sign — ahead on the track you pay the FULL magnitude in life; behind, your opponent gains 1 Influence instead (no life paid). At Influence 0 it is a clean no-op. Half-Power / full-Life is Griff's own tuning: his raw #107 text was full-X Power, and he halved the bump on-thread to pull the ceiling down (+3 not +6 at Influence 6) while keeping the full-life sting so being ahead still hurts to fire. The buff reads |Influence| (a positive pump whether ahead or behind); only the sign chooses the price. Rounding is floor — half, rounded down (the engine's standard; +5 Influence → +2 to the board). New engine plumbing: a per:{count:'influence',half?} count (live |Influence|, optionally halved) and a cond on the damage op (the self-life price fires only while ahead). ⚑ ratify/veto.
