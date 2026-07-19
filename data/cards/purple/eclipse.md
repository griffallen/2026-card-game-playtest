---
name: Eclipse
type: action
cost: 7
pips: purple, purple, purple
status: draft
art: /cards/eclipse.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"lockPlays","who":"opponent"},{"op":"discardRandom","who":"opponent","n":1},{"op":"draw","upTo":7}]}
---
Your opponent can't play cards from their hand this round. They discard 1 card at random. Draw until you have 7 cards in hand.

## Design notes

Session 006 proposal: The wither bomb — the whole board fades.
First sims: at 6 it deleted yellow's whole plan; 7 makes it the finisher it reads as.

2026-07-19 (#122): reworked from a permanent board-wide -2 Power wither into a three-piece
tempo-lock finisher, cost/pips unchanged (7, purple x3). Resolves atomically on play, in text order:
(1) lockPlays who:opponent — the opponent plays NO cards from hand for the rest of this round; the
gate is getLegalActions, so their board still acts (attacks, moves, abilities, Sneak) — it's a
hand-lock, not a stun. (2) discardRandom who:opponent n:1 — a SEEDED random discard (pulled from the
same threaded PRNG as the shuffle, not a chosen card), a silent no-op on an empty hand with no
decision-33 penalty. (3) draw upTo:7 — fill the caster's hand to 7, measured live (Eclipse is already
gone), and it respects the empty-deck penalty like every other draw, so over-drawing a thin deck to
reach 7 can hurt you. The lock lifts at the round rollover, honoring "this round."
