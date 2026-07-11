---
name: Last Stand
type: action
cost: 7
pips: red, red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"buff","t":{"side":"friendly"},"p":2,"dur":"round"},{"op":"damage","t":"selfBase","n":2}]}
---
Your units gain +2 Power this round. You lose 2 life.
