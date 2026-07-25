---
name: Nightweaver
type: unit
cost: 3
power: 3
health: 3
pips: purple
status: canon
art: /cards/nightweaver.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"exhaust","t":"chosen0"},{"op":"damage","t":"selfBase","n":1,"per":{"count":"targetPipCount"}}]}
---
When this enters play, exhaust an enemy unit. Lose Life equal to that unit's pip count.
