---
name: Burn the Frontline
type: action
cost: 6
pips: red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"zone"}],"onPlay":[{"op":"damageFilter","f":{"side":"all","zone":"chosenZone"},"n":6}]}
---
Choose a zone. Deal 6 damage to every unit there — yours included.

## Design notes

Session 006: was 7 mana for 4 damage in one zone — strictly worse than Scorching Howl (5 mana, 3 damage everywhere). Now the wall-breaker: 6 mana, 6 damage to one zone, both sides. Kills almost every yellow wall through the fortress plan; the friendly-fire is the red cost made visible.
