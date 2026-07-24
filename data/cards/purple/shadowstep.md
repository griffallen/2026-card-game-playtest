---
name: Shadowstep
type: action
cost: 3
pips: purple, purple
status: canon
art: /cards/shadowstep.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"},{"t":"zone","differentFromFirst":true}],"onPlay":[{"op":"grant","t":"chosen0","kw":{"k":"hidden"},"dur":"round"},{"op":"move","t":"chosen0","to":"chosenZone"},{"op":"draw","n":1}]}
---
Target friendly unit gains Hidden this round. Move it to any zone. Draw a card.

## Design notes

2026-07-11 (v3 churn pass 2, charter #10: reactive control): the escape trick: a round of the veil (ready = safe) plus a card. Purple pays for knowledge either way.
