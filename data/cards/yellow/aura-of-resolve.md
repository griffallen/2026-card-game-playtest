---
name: Aura of Resolve
type: upgrade
cost: 3
influenceTrigger: onDefend
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onDefend":[{"op":"influence","n":2}]}
---
Attach to unit. When this unit defends, gain 2 Influence.

## Design notes

Session 006 redesign: was "at the start of your round, gain 1 Influence" — passive income, illegal under the yellow charter (influence is event-earned, decision 34). Now it pays when the wearer defends: put it on a Guard and get paid for every intercept.
