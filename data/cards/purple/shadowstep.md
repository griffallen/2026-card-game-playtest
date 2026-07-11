---
name: Shadowstep
type: action
cost: 2
pips: purple
status: draft
art: /cards/shadowstep.svg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"grant","t":"chosen0","kw":{"k":"hidden"},"dur":"round"},{"op":"draw","n":1}]}
---
Target friendly unit gains Hidden this round. Draw a card.

## Design notes

2026-07-11 (v3 churn pass 2, charter #10: reactive control): the escape trick: a round of the veil (ready = safe) plus a card. Purple pays for knowledge either way.
