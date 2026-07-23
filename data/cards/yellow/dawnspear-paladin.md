---
name: Dawnspear Paladin
type: unit
cost: 5
power: 3
health: 3
keywords: armor 3, steadfast 1
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {}
---
Armor 3. Steadfast 1.

## Design notes

Session 006: dropped the "may" — strictly-beneficial effects auto-apply (decision 24), so the card now says what happens.

2026-07-16 (#104, Griff: "yes to both recs, Influence drop intended"): the Paladin trades its
influence engine for a defensive brace. The old on-attack +2 Influence is gone; now, when it is
attacked, it gains +1 Power PER attacker for the round — and, under the v3 duel law, it strikes
back with that buffed power (ganged by three, it counters at 6, not 3). Stats stay 3/3; the buff
resets at end of round. Needed two engine extensions: `per` on the `buff` op (the same
`per:{count:'attackers'}` Light's Vanguard uses for influence), and firing onDefend BEFORE the
retaliation power is read in blocker combat (it fired too late before — after the counter/retaliation
was already snapshotted).
