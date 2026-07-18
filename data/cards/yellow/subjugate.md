---
name: Subjugate
type: upgrade
cost: 3
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"attach":{"side":"enemy"},"statics":[{"s":"aura","scope":"attached","pPerHostPip":-2}]}
---
Attach to an enemy unit. While attached, it gets −2 Power for each pip in its cost.

## Design notes

Session 006, prison ladder: Subjugate 3 = unrestricted imprison that leaves a mark — the prisoner comes back weaker. The old "if your Influence is 5 or less" condition was noise; the rider is now unconditional.

2026-07-11 (v3 churn pass 3): prison dies (#9), Capture succeeds it. Rung 3: the breaking — permanent humiliation instead of walls.
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): the flat 'Gain 1 Influence' rider is cut (your Iron Plating direction, applied wholesale — influence should be earned at moments, not stapled to spells; this slows yellow's influence clock directly). ⚑ ratify/veto.
2026-07-14 (PR #80, designer's rework — mechanic confirmed): action → upgrade, the game's first ENEMY-attaching upgrade. The breaking becomes a brand: it scales with the host's pedigree — Worldrender (3 pips) kneels for −3, a footsoldier for −1. Cost stays 3 with two yellow pips (ruling: the PR's one-pip proposal was rejected). The debuff is a live attached aura, not a snapshot: if the host falls and the shackle is salvaged (decision 67), the −X re-fits the new host's pips — and salvage follows the card's law, onto a unit hostile to the salvager.

2026-07-18 (PR #117, designer buff): −1 → −2 per host pip. At −1 the debuff was a whisper (most units are 1-2 pips); Griff opened the PR at −3, but −3 zeroes every red unit with 2+ pips outright — so we landed on −2, the surgical middle: small units gutted, Garok/Behemoth crippled but still swinging for 1-2, 3-pip giants broken without the whole curve going to zero. His call between the options laid out on the PR.
