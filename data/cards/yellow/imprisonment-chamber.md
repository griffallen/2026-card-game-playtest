---
name: Imprisonment Chamber
type: action
cost: 5
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"imprison","t":"chosen0"}]}
---
Imprison target unit. At the start of your round, lose 1 Influence.

## Design notes

⚑ The printed "at the start of your round, lose 1 Influence" is the global Prison Decay rule (v1.2) — not charged twice.
