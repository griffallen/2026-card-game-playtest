---
name: Censer of Purity
type: unit
cost: 5
power: 0
health: 6
pips: yellow, yellow
keywords: tribune
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"activated":{"amount":"moveDamage","targets":[{"t":"unit","side":"friendly","mustBeDamaged":true}],"ops":[{"op":"moveDamage","from":"chosen0","to":"self"}]}}
---
Tribune. As an action, move any amount of damage from one friendly unit onto this unit — up to what this unit can take without its Health falling below 0. Doing so exhausts the Censer.

## Design notes

#104 rework (Griff): the old start-of-round "lose 1 Influence, heal 2 from your base" engine is gone — "change text" replaces it wholesale. The Censer is now a martyr: it stands in the middle as a Tribune and, once per turn cycle, draws an ally's wounds onto itself.

The ability is the engine's first activated ability that takes a player-chosen number: pick a friendly unit, then pick how much of its damage to move. The amount is capped at the smaller of the ally's current damage and the Censer's remaining Health — moving enough to reach exactly 0 Health is a full martyr's sacrifice and kills the Censer (permitted: the cap forbids going *below* 0, not reaching it). It is a transfer of existing wounds, so armor and shields never soften it.
