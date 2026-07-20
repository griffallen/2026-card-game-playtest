---
name: Glimpse
type: action
cost: 1
pips: purple
status: canon
art: /cards/glimpse.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"draw","n":3},{"op":"chooseFromHand","to":"discard"},{"op":"chooseFromHand","to":"deckBottom"}]}
---
Draw 3 cards, then discard 1 card from your hand and put 1 card from your hand on the bottom of your deck.

## Design notes

2026-07-19 (#122, Griff's rework): was a plain "Draw a card." Now a draw-3 filter — dig three deep, keep one to hand, throw one away, tuck one to the bottom to see again later. Costs/pips unchanged (1 / purple); Griff changed only the text. Rides the new pick-from-hand foundation: draw resolves inline, then each `chooseFromHand` enqueues one atomic pick answered by its own `resolveChoice`. Eligibility is the LIVE hand at each step, so both picks range over the WHOLE hand (the 3 just drawn plus everything already held), and the card discarded first is automatically off the table for the bottom pick. Caster always holds ≥3 after drawing, so both picks exist — no edge.
