---
name: Twilight Scout
type: unit
cost: 2
power: 1
health: 1
keywords: infiltrate
pips: purple
status: canon
art: /cards/twilight-scout.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"revealHand","who":"opponent"}]}
---
Infiltrate. When this enters play, look at your opponent's hand.

## Design notes

2026-07-11 (v3 churn pass 2, charter #10: reactive control): flier grounds into the Infiltrate scout — purple's map presence starts anywhere.

2026-07-19 (#122): reworked from a 2/3 vanilla Infiltrate body into a 1/1 one-time hand-peek scout,
cost unchanged (2). Power 2→1, health 3→1; KEEPS Infiltrate. The new onPlay op `revealHand` reads the
opponent's hand as it is the INSTANT the scout lands — a frozen snapshot, not a permanent reveal (a
standing perfect-info stream would be far too strong on a 1/1). It's a HUMAN-FACING read tool: the
heuristic AI is omniscient (it already sees every hand), so the peek is a deliberate no-op headless and
the sim will UNDERVALUE the card — its whole value is the human read, not a stat swing.
