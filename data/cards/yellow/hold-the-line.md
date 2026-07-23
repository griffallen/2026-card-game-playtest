---
name: Hold the Line
type: action
cost: 2
pips: yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"grant","t":"chosen0","kw":{"k":"sentry"},"dur":"round"}]}
---
This round, target unit gains Sentry.

## Design notes

Decision 52: "this zone" on an action means "choose a zone" — the text now says so.
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): the flat 'Gain 1 Influence' rider is cut (your Iron Plating direction, applied wholesale — influence should be earned at moments, not stapled to spells; this slows yellow's influence clock directly). ⚑ ratify/veto.
