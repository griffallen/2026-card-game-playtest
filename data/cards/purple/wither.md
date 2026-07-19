---
name: Wither
type: upgrade
cost: 2
pips: purple
status: draft
art: /cards/wither.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"attach":{"side":"enemy","consumedOnHostDeath":true},"onPlay":[{"op":"buff","t":"attached","p":-1,"h":-1,"dur":"perm"}],"startOfRound":{"ops":[{"op":"buff","t":"attached","p":-1,"h":-1,"dur":"perm"}]}}
---
Target enemy unit gets -1 Power and -1 Health permanently. The rot takes hold: at the start of each round, it withers a further -1/-1. (Power floors at 0; a unit withered to 0 Health dies.)

## Design notes

Session 006 proposal: The signature removal: purple weakens instead of burning (red) or walling (yellow). Power floors at 0.
First sims: 1 mana was a permanent answer to any attacker — 2 respects red.

2026-07-19 (issue #122, designer rework — mechanic confirmed): action → enemy-attach curse-upgrade, reusing Subjugate's enemy-attach machinery. The one-shot -2 Power becomes a persistent rot: on play the host takes a permanent -1/-1, and at each round-start thereafter it withers a further -1/-1 (play: -1/-1; next round: -2/-2; then -3/-3…) — a slow death-spiral. Cost stays 2; pips drop to one purple (the curse is a commitment that pays off over rounds, not a burst). It is CONSUMED with its host when the host dies (a rot curse shouldn't survive its victim and jump to a new one), unlike a normal upgrade that orphans (decision 67). Counterplay is free with the upgrade model: destroy the curse to stop the rot — but the -1/-1s already stamped are permanent, so the scars remain.
