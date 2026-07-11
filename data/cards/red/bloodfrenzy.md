---
name: Bloodfrenzy
type: upgrade
cost: 3
pips: red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"statics":[{"s":"aura","scope":"attached","p":1},{"s":"aura","scope":"attached","armor":1}],"startOfRound":{"cond":{"selfLifeAtMost":10},"ops":[{"op":"buff","t":"attached","p":1,"dur":"perm"}]}}
---
Attached unit gets +1 Power and Armor 1. At the start of your round, if you have 10 or less life, attached unit gets +1 Power permanently.

## Design notes

Session 006: threshold 5 → 10 life and cost 5 → 3. At ≤5 life the game is usually already decided; half-life is where red's desperation engine should start paying.

2026-07-11 (designer, issue #4): immediate +1 Power / Armor 1 on attach added; the ≤10-life
desperation engine unchanged. Threshold kept at "10 or less" (established) though the request
said "less than 10" — flagged on the thread.
