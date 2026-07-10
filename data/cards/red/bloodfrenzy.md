---
name: Bloodfrenzy
type: upgrade
cost: 3
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"startOfRound":{"cond":{"selfLifeAtMost":10},"ops":[{"op":"buff","t":"attached","p":1,"dur":"perm"}]}}
---
At the start of your round, if you have 10 or less life, attached unit gets +1 Power permanently.

## Design notes

Session 006: threshold 5 → 10 life and cost 5 → 3. At ≤5 life the game is usually already decided; half-life is where red's desperation engine should start paying.
