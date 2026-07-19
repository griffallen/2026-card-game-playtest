---
name: Mist Stalker
type: unit
cost: 2
power: 1
health: 1
keywords: infiltrate
pips: purple
status: draft
art: /cards/mist-stalker.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"draw","n":1},{"op":"chooseFromHand","to":"deckBottom","n":1}]}
---
Infiltrate. When this enters play, draw a card, then put a card from your hand on the bottom of your deck.

## Design notes

2026-07-19 (#122, Griff's rework): was a 2/2 with onKill Influence. Now a 1/1 Infiltrate deploy-anywhere
body whose enter-play effect is the pick-from-hand foundation from a UNIT trigger: `draw 1` resolves
inline, then `chooseFromHand to:deckBottom` enqueues one atomic pick (answered by its own resolveChoice)
that ranges over the WHOLE live hand. The onKill Influence dial is dropped — this is a filter, not a
bounty-hunter. The unit's play parks in phase 'choose' after onPlay runs, exactly as an action does.
