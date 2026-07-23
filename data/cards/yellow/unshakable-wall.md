---
name: Unshakable Wall
type: upgrade
cost: 5
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"statics":[{"s":"aura","scope":"attached","p":2,"armor":2},{"s":"aura","scope":"attached","kw":{"k":"steadfast","n":2}}],"onPlay":[{"op":"grant","t":"self","kw":{"k":"shielded"},"dur":"perm"}]}
---
This unit gains a Shield, Steadfast 2, +2 Armor, and +2 Power.
