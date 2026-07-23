---
name: Command Edict
type: action
cost: 7
pips: yellow, yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"ready","side":"friendly","remember":"readiedUnits"},{"op":"damage","t":"enemyBase","n":1,"per":{"count":"readiedUnits"}},{"op":"influenceOpponent","n":1,"per":{"count":"readiedUnits"}}]}
---
Ready all your units. Your opponent loses Life and Hope equal to the number of units readied this way.

## Design notes

Session 006 redesign: was +2 Armor for one round at 7 — a fog effect priced like a finisher. Now the fortress decree: permanent board-wide Armor 1.
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): the flat +2 rider is cut — under death-only capture (decision 92) and the duel law, the effect alone carries the cost. ⚑ ratify/veto.
