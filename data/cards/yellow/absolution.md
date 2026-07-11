---
name: Absolution
type: action
cost: 4
influenceTrigger: onPlay
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"removeNegative","t":"chosen0"},{"op":"influence","n":1}]}
---
Free target friendly unit from imprisonment and remove its negative effects. Gain 1 Influence.

## Design notes

Session 006: 7 → 3 mana and the text now says what removeNegative actually does (it is primarily a jailbreak). A situational cleanse was priced like a bomb.
