---
name: Veil of Silence
type: action
cost: 6
pips: purple, purple
status: canon
art: /cards/veil-of-silence.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"grant","t":{"side":"enemy"},"kw":{"k":"cantAttack"},"dur":"round"},{"op":"damage","t":"enemyBase","n":1,"per":{"count":"exhaustedEnemyUnits"}}]}
---
Enemy units can't attack this round. Your opponent takes damage equal to the number of exhausted enemy units.

## Design notes

2026-07-19 (#122, Griff's rework): keeps the round-long cantAttack silence and adds a base burn that scales
with the enemy's spent board — `damage enemyBase n:1 per:{count:'exhaustedEnemyUnits'}`, reusing the existing
`exhaustedEnemyUnits` PerCount (no new primitive). The grant runs first (it never changes exhaustion, so the
count is stable), then the burn tallies every in-play enemy unit that is currently Exhausted. An empty or all-ready
enemy board is a clean no-op (0 damage).
