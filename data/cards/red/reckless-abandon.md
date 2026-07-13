---
name: Reckless Abandon
type: action
cost: X
pips: red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"xSurge","t":"chosen0"}]}
---
Pay any number of resources. Lose X Influence: one of your units gets +X Power and Breakthrough this round.

## Design notes

2026-07-13 (designer, issue #45): "Pay any number of resources and lose X influence to give one
unit +X strength and breakthrough." The game's first X card — new vocabulary: `cost: X` in the
frontmatter, the declared X flows into the effect. Name and art (borrowed from Reckless Charge)
are agent picks, ⚑ freely rename/re-art.

⚑ Agent assumptions to ratify or veto: the pump and Breakthrough last **this round** (red's pump
grammar); the target is **friendly**; **X=0 is legal** (a free Breakthrough rider); **2 red pips**
(a scaling finisher reads deep-red, though the cost-tier grammar has no row for X); single copy
in Crimson Assault (an X finisher isn't a ≤2-cost workhorse for the doubles rule).
