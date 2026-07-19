---
name: Assassin's Contract
type: upgrade
cost: 4
influenceTrigger: onKill
pips: purple, purple
status: draft
art: /cards/assassin-s-contract.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"statics":[{"s":"aura","scope":"attached","p":2}],"onKill":[{"op":"influence","n":1}]}
---
Attached unit gets +2 Power. When it defeats a unit, gain 1 Influence.
