---
name: Obscure
type: action
cost: 3
pips: purple, purple
status: draft
art: /cards/obscure.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"draw","n":2},{"op":"chooseFromHand","who":"each","to":"discard"}]}
---
Draw 2 cards, then both you and your opponent discard a card.

## Design notes

2026-07-19 (#122, Griff's rework): the old `preventBase 2` + `draw 1` is fully replaced by `draw 2` + a symmetric discard on the new pick-from-hand foundation. Costs/pips unchanged (3 / purple purple); Griff changed only the text. `chooseFromHand who:'each'` enqueues one pick for the caster THEN one for the opponent — the caster resolves their own discard first, then actorSeat flips to the opponent for theirs (real pending-choice entries, answered by the opponent's policy in sims and by the human in the hotseat demo, exactly as combat flips to the defender). An empty opposing hand is a silent no-op (a discard, not an empty draw — decision 33's life/influence penalty does NOT apply): no entry is enqueued for a seat with no cards.
