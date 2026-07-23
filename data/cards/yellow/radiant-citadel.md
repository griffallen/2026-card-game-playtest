---
name: Radiant Citadel
type: unit
cost: 7
power: 1
health: 4
keywords: guard, sentry, armor 2, steadfast 1
pips: yellow, yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDamage":[{"op":"healFromDamageTaken"}]}
---
Guard. Sentry. Armor 2. Steadfast 1. Whenever this unit takes damage, gain Life equal to the damage dealt.

## Design notes

2026-07-14 (#69, Griff): the summoning wall replaces the old threshold static — decision 49's
oppThreshold +2 is dropped, and the old 1/8 body becomes 1/4 with Armor 2 (Griff ruled the
stats at 18:11). One cast, three walls: the entry check counts only YOUR Radiant Citadels, so
the two copies enter, run the same check against a board of three, and fizzle — that's the
whole recursion fuse. An opponent's Citadels never touch your check. Copies are born ready in
your Home at 0/1 with Guard/Tribune/cantAttack and no Armor (only the body was respecified;
the parent keeps Armor 2). Copies were never deck cards: they vanish on death, touching no
discard pile.
