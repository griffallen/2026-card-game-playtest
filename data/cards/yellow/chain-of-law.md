---
name: Chain of Law
type: upgrade
cost: 3
influenceTrigger: onPlay
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"statics":[{"s":"aura","scope":"attached","kw":{"k":"guard"}},{"s":"aura","scope":"attached","armor":1}],"onPlay":[{"op":"influence","n":1}]}
---
Attached unit has Guard and Armor 1. Gain 1 Influence.

## Design notes

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Untargetable is purple's (as Hidden) now; the chain deputizes instead — Guard + Armor 1, and in v3 orphaned chains are salvageable (decision 67).
