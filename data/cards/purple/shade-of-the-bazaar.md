---
name: Shade of the Bazaar
type: unit
cost: 4
power: 3
health: 2
pips: purple
status: canon
art: /cards/shade-of-the-bazaar.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"draw","n":1}]}
---
When this enters play, draw a card.

## Design notes

2026-07-19 (#122, Griff's rework): 3/4 → 3/2 and re-pipped from **PP → P** (a single purple). Cost 4, power 3,
and the onPlay cantrip are unchanged. Griff directed this as a **tax-EASIER pip deviation**: the grammar wants
2 pips at cost 4, but a 1-pip Shade is deliberately splashable into other decks (the same lever the doc's
lighter-taxed cards use). Recorded in the pip-proposal deviation table (docs/DESIGN/06-PIP-PROPOSAL.md). The
pip grammar is a documented design convention, not a code check — `cards:check` does not reject the 1-pip form.
