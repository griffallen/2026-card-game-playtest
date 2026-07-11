---
name: Hold the Line
type: action
cost: 2
influenceTrigger: onPlay
pips: yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"zone"}],"onPlay":[{"op":"grant","t":{"side":"friendly","zone":"chosenZone"},"kw":{"k":"guard"},"dur":"perm"},{"op":"influence","n":1}]}
---
Choose a zone. Your units there gain Guard. Gain 1 Influence.

## Design notes

Decision 52: "this zone" on an action means "choose a zone" — the text now says so.
