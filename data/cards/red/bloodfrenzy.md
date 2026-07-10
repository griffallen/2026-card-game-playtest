---
name: Bloodfrenzy
type: upgrade
cost: 5
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"startOfRound":{"cond":{"selfLifeAtMost":5},"ops":[{"op":"buff","t":"attached","p":1,"dur":"perm"}]}}
---
At the start of your round, attached unit gets +1 Power if you have 5 or less life.
