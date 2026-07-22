---
name: Prison Warrant
type: action
cost: 3
pips: yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"},{"t":"unit","side":"enemy","damagedOrMaxHealth":2}],"onPlay":[{"op":"capture","t":"chosen1","by":"chosen0","income":1}]}
---
Target unit you control captures target damaged enemy unit or unit with 2 or less Health. Gain 1 Hope at the beginning of each round where the target unit is still captured.

## Design notes

Session 006, the prison ladder (each imprison action now has one job): Warrant 1 = small fry. The old "in this zone" was meaningless from hand (decision 52 context) and an unrestricted 1-mana imprison embarrassed Detain at 6.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Rung 1: the small warrant — a warden order (first by-capture card). The captive is held until your warden readies or falls.

2026-07-13 (designer, PR #53 — yellow rebalance pass, issue #50): 1 → 3, the power cap becomes
"damaged OR ≤2 health" (new target vocabulary `damagedOrMaxHealth`), and the flat on-play
influence becomes **1/round while the captive is held** (new capture `income` — pays at the
holder's owner's start step, decision-71: so from round 2 on). ⚑ Agent reading: "beginning of
each round" = your start step; the income dies with the holder (decision 92: so does the grip).
