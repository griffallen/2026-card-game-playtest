---
name: Hold the Line
type: action
cost: 2
influenceTrigger: onPlay
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"zone"}],"onPlay":[{"op":"grant","t":{"side":"friendly","zone":"chosenZone"},"kw":{"k":"guard"},"dur":"perm"},{"op":"influence","n":1}]}
---
Give all friendly units in this zone Guard. Influence: +1.

## Design notes

⚑ "This zone" read as "choose a zone".
