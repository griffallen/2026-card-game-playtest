---
name: Burning Oath
type: upgrade
cost: 4
pips: red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"influence","n":1}],"onKill":[{"op":"influence","n":1}],"statics":[{"s":"aura","scope":"attached","p":2},{"s":"aura","scope":"attached","kw":{"k":"breakthrough"}}]}
---
This unit gets +2 Power and Breakthrough. When this attaches, gain 1 Hope. Then gain 1 Hope each time its bearer defeats a unit (a trade counts).

## Design notes

Session 006 redesign: was +2 Power and Rush — the Rush half was dead text on any unit already in play (decision 41). Breakthrough keeps the oath aggressive and permanent.

2026-07-16 (#107 balance pass, phase 2 group A — Griff's ruling on the influence-trigger cards): the oath now feeds the influence track too. An on-attach gain (the upgrade's onPlay influence fires as it lands on its carrier) plus an ongoing per-kill gain — the upgrade's onKill fires through its bearer, so every unit the equipped body defeats, trade included, pays 1. The +2 Power / Breakthrough stays.
