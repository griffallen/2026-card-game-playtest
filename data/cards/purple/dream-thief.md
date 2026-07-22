---
name: Dream Thief
type: unit
cost: 5
power: 4
health: 4
keywords: hidden, sneak
pips: purple, purple
status: canon
art: /cards/dream-thief.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"draw","n":1}],"sneak":{"ops":[{"op":"influence","n":2}]}}
---
Hidden. When this enters play, draw a card. Sneak — gain 2 Hope.

## Design notes

2026-07-11 (v3 churn pass 2, charter #10: reactive control): purple's influence is REACTIVE (decision 63/#10 thread): the thief steals standing, not ground — Sneak gains 2 Influence. Draw stays.

2026-07-11 (#23 consistency sweep): printed text was stale v2.3 ("Flying", a retired keyword) while frontmatter/effects were already v3 (hidden, sneak). Rewritten to match the effects, following the "Hidden. … Sneak — …" convention of its siblings. Flagged in the open-questions ledger for Griff's blessing on the wording.
