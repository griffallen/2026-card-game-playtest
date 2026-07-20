---
name: Duskweaver Oracle
type: unit
cost: 6
power: 2
health: 6
keywords: politician, sneak
pips: purple
status: canon
art: /cards/duskweaver-oracle.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"draw","n":1},{"op":"influence","n":1}],"sneak":{"ops":[{"op":"draw","n":2},{"op":"chooseFromHand","to":"deckBottom","n":1}]}}
---
Politician. When this enters play, draw a card and gain 1 Influence. Sneak - draw 2 cards, then put a card from your hand on the bottom of your deck.

## Design notes

2026-07-19 (#122, Griff's rework): was a plain 4/6 "draw 2 on enter." Now a 2/6 Politician whose enter-play
bundle draws a card and sways the track (+1 Influence, both resolve inline). Its Sneak is the pick-from-hand
foundation firing from an ACTIVATE context: `draw 2`, then `chooseFromHand to:deckBottom` enqueues one pick
— the Sneak taps the Oracle, parks the game in phase 'choose', and continues once the bottom card is chosen.
The `sneak` keyword is carried alongside `politician` because a Sneak ability is only activatable when the
unit actually has the keyword (the engine and the legal-action enumerator both gate on it).
