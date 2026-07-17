---
name: Crimson Behemoth
type: unit
cost: 5
power: 6
health: 6
pips: red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onAttack":[{"op":"damageFilter","f":{"side":"all","zone":"sameAsSelf","other":true},"n":2,"creditsKills":true}],"onKill":[{"op":"influence","n":1}]}
---
When this attacks, deal 2 damage to each other unit in its zone, yours included. When this kills a unit, gain 1 Influence.

## Design notes

#107 balance pass (2026-07-16). Two changes fold in Griff's red-influence-economy ruling. First, the splash moved off the base-only trigger onto every attack — "attacks a zone" now fires whenever the Behemoth declares an attack (unit or base), dealing 2 to each other unit in ITS zone (the combat zone). It stays zone-scoped: Griff's terse text dropped the "in the zone" qualifier, but every discussion in #107 says "in the zone / a crowded zone," and the engine already spoke `zone: sameAsSelf` — board-wide was the less defensible reading. Second, it now earns 1 Influence for every unit it kills, its own collateral included (Griff #107: "any unit that gets killed, even your own, gets the Influence"). The splash credits kills via the new damageFilter `creditsKills` flag; ordinary combat kills credit through the standard onKill path. Health stayed 6 (set in phase 1). Prior history: re-ruled playtest 004 to splash the defended Home both sides; session 006 trimmed 6/6 → 6/5, since restored to 6/6.
