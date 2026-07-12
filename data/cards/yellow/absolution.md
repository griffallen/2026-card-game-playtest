---
name: Absolution
type: action
cost: 4
influenceTrigger: onPlay
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"removeNegative","t":"chosen0"},{"op":"freeCaptives"},{"op":"influence","n":1}]}
---
Remove all negative effects from target unit you control. Free all your captured units. Gain 1 Influence.

## Design notes

Session 006: 7 → 3 mana and the text now says what removeNegative actually does (it is primarily a jailbreak). A situational cleanse was priced like a bomb.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. The jailbreak: the first freeCaptives card — your people come home (originally dazed; ready since decision 73).
