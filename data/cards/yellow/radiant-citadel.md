---
name: Radiant Citadel
type: unit
cost: 7
power: 1
health: 4
keywords: guard, tribune, cantAttack, armor 2
pips: yellow, yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"createCopies","n":2,"p":0,"h":1,"kw":[{"k":"guard"},{"k":"tribune"},{"k":"cantAttack"}],"ifOnlyCopy":true}]}
---
This can't attack. When it enters play, if it's the only Radiant Citadel you own in play, it raises two 0/1 copies of itself in your Home — ready, with Guard and Tribune, unable to attack. Copies vanish when they die.

## Design notes

2026-07-14 (#69, Griff): the summoning wall replaces the old threshold static — decision 49's
oppThreshold +2 is dropped, and the old 1/8 body becomes 1/4 with Armor 2 (Griff ruled the
stats at 18:11). One cast, three walls: the entry check counts only YOUR Radiant Citadels, so
the two copies enter, run the same check against a board of three, and fizzle — that's the
whole recursion fuse. An opponent's Citadels never touch your check. Copies are born ready in
your Home at 0/1 with Guard/Tribune/cantAttack and no Armor (only the body was respecified;
the parent keeps Armor 2). Copies were never deck cards: they vanish on death, touching no
discard pile.
