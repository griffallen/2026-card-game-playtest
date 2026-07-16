---
name: Bloodfrenzy
type: upgrade
cost: 3
pips: red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"statics":[{"s":"aura","scope":"attached","p":1,"h":1,"cond":{"influenceAtLeast":1}},{"s":"aura","scope":"attached","p":2,"h":2,"cond":{"influenceAtMost":0}},{"s":"aura","scope":"attached","kw":{"k":"breakthrough"}}]}
---
Attached unit gets +1 Power and +1 Health and Breakthrough. If you have Influence 0 or less, this unit gets +2 Power and +2 Health instead.

## Design notes

Session 006: threshold 5 → 10 life and cost 5 → 3. At ≤5 life the game is usually already decided; half-life is where red's desperation engine should start paying.

2026-07-11 (designer, issue #4): immediate +1 Power / Armor 1 on attach added; the ≤10-life
desperation engine unchanged. Threshold kept at "10 or less" (established) though the request
said "less than 10" — flagged on the thread.

2026-07-16 (#107 balance pass, phase 2 — Griff's rework): the ≤10-life engine and the flat
Armor are gone. Bloodfrenzy is now a comeback upgrade tied to the Influence track: +1 Power /
+1 Health and Breakthrough while attached, growing to +2 Power / +2 Health *instead* (not on top —
+2/+2 total, never +3/+3) whenever the controller's Influence is 0 or less. Griff (#107): the
conditional buff re-checks LIVE as Influence swings — drop below zero and it grows, climb back and
it shrinks. Wired as three attached auras: a mutually-exclusive stat pair (`influenceAtLeast:1`
vs `influenceAtMost:0`) plus an unconditional Breakthrough grant. This is the balance pass's first
conditional attached aura — the engine now honors an attached aura's `cond`, re-read live on every
effPower/effHealth (helpers.ts `upgradeGrants`).
