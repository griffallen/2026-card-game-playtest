---
name: Flameblade Raider
type: unit
cost: 2
power: 4
health: 1
keywords: rush, breakthrough
pips: red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDeath":[{"op":"influence","n":-1}],"onKill":[{"op":"influenceOpponent","n":1}]}
---
Rush. Breakthrough. When this unit dies, lose 1 Hope. When this unit defeats a unit, your opponent loses 1 Hope.

## Design notes

2026-07-16 (#107 balance pass, phase 2 group A — Griff's ruling on the influence-trigger cards): the raider became an influence martyr. It always paid nothing before; now it gives 1 on death and a second Influence when it dies dealing a lethal blow. New engine vocabulary: an onDeath influence op with `ifKilled` — a unit that dies in a trade (it fell a unit in the same combat that killed it) is credited. "A trade counts as a kill" is Griff's one rule for every "kills/defeats" card in this batch.
