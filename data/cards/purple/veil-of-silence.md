---
name: Veil of Silence
type: action
cost: 6
pips: purple, purple
status: draft
art: /cards/veil-of-silence.svg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"grant","t":{"side":"enemy"},"kw":{"k":"cantAttack"},"dur":"round"}]}
---
Enemy units can't attack this round.
