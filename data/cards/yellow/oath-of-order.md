---
name: Oath of Order
type: upgrade
cost: 1
pips: yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"statics":[{"s":"aura","scope":"attached","kw":{"k":"guard"}}],"onPlay":[{"op":"heal","t":"selfBase","n":1,"per":{"count":"units","f":{"side":"all","zone":"all"}}}]}
---
Gain 1 Life for each unit in play. This unit gains Guard.

## Design notes

2026-07-13 (designer, PR #52 — yellow rebalance pass, issue #50): the +1 Power rider is cut; Guard alone for 1. Notable under the proposed #50 rework, where Guard becomes the only bodyguard.
