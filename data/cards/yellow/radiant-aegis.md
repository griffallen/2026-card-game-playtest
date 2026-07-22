---
name: Radiant Aegis
type: action
cost: 3
pips: yellow, yellow
influenceTrigger: onPlay
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"grant","t":"chosen0","kw":{"k":"shielded"},"dur":"perm"},{"op":"influence","n":2,"cond":{"influenceAtMost":-1}}]}
---
Give a friendly unit a Shield. If your Hope is below 0, gain 2 Hope.

## Design notes

Session 006: 1 → 2 mana. Armor 2 blanks red's whole cheap-burn suite; at 1 mana it was the best card in the pool. The armor ladder: Aegis 2 (Armor 2, one unit), Radiant Wall 5 (Armor 3), Command Edict 7 (Armor 1, everyone).
2026-07-13 (agent pass, issue #55 — designer commission: "take a crack at modifying all Yellow cards"): the flat 'Gain 1 Influence' rider is cut (your Iron Plating direction, applied wholesale — influence should be earned at moments, not stapled to spells; this slows yellow's influence clock directly). ⚑ ratify/veto.
2026-07-14 (#79, ratified with Griff): the whole card is rebuilt off the armor ladder. Now 3 mana, two yellow pips. It no longer prints permanent Armor 2 — it grants a **Shield** (the one-time ward: the first hit is prevented, then the token is spent), a cleaner fit with yellow's defensive-tempo identity than a permanent stat bump. New rider, deliberately gated: **only when your Influence is below 0** do you gain 2 — a catch-up valve for when yellow has been pushed off the track, never a free stapled gain. Two new engine primitives: granting `shielded` now raises the real shield token (it was a no-op before — the keyword line displayed a ward that didn't exist), and the `influence` op can carry a `cond`.
