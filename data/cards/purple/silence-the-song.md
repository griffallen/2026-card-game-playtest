---
name: Silence the Song
type: upgrade
cost: 3
pips: purple, purple
status: canon
art: /cards/silence-the-song.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"attach":{"side":"any"},"statics":[{"s":"aura","scope":"attached","p":-2}],"onHostDeath":[{"op":"draw","n":2}]}
---
Attach to any unit — it gets −2 Power. When it dies, draw 2 cards.

## Design notes

2026-07-19 (issue #122, designer rework — mechanic confirmed): action → upgrade. The old cost-4 onPlay debuff (−2 Power + draw 1) becomes a permanent brand. Cost 3, two purple pips kept. It attaches to ANY unit — the game's first any-side attach (Subjugate is enemy-only; Iron Plating friendly-only): Griff wants to be able to shackle his OWN unit and still cash in. While attached the host loses a FLAT 2 Power (an aura, not Subjugate's per-pip scaling). When the host dies the UPGRADE's owner draws 2 — attach it to your own unit or the enemy's, and whichever falls, YOU draw. The gear then orphans in the fallen host's zone (decision 67) like any other upgrade.
