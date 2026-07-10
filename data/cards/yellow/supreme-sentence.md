---
name: Supreme Sentence
type: action
cost: 7
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"imprison","t":"chosen0"}]}
---
Imprison target unit. If your Influence is 15 or more, imprison another.

## Design notes

⚑ The 15+ clause can never fire while 15 IS the win threshold — inert as printed. Needs design.
