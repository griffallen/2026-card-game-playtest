---
name: Volcanic Slam
type: action
cost: 3
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"any","count":2,"upTo":true,"sameZone":true}],"onPlay":[{"op":"damage","t":"chosen0","n":3},{"op":"damage","t":"chosen1","n":3}]}
---
Deal 3 damage to up to two units in the same zone.

## Design notes

2026-07-11 (designer, issue #4): one eruption, one zone — trades face-reach for a second body.
First upTo/sameZone card. Under decision 68's curve a 3-cost dealing up to 6 across two bodies
is the convex rate red wants.
