---
name: Scorching Howl
type: action
cost: 5
pips: red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"damageFilter","f":{"side":"all"},"n":3},{"op":"damage","t":"selfBase","n":3},{"op":"damage","t":"enemyBase","n":3}]}
---
Deal 3 damage to all units. Each player loses 3 Life.
