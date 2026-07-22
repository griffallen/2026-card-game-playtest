---
name: Devout Intervention
type: action
cost: 4
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onPlay":[{"op":"wardHome"},{"op":"wardBlocker"}]}
---
Prevent all damage to your base from the next attack this round. Also, prevent all damage to your next blocking unit this round (it still deals its damage back).

## Design notes

Session 006: 6 → 3 mana. A one-round shield priced like a wall.

2026-07-15 (#88, Griff ratified): the flat "prevent 3 base damage" becomes two one-shot wards, still 4 mana / two yellow pips. **Home ward** — the next damaging *attack* on your Home is fully turned aside; it waits patiently, spending only when it actually prevents damage (a feint that gets fully blocked leaves the ward armed), and it does NOT stop direct-damage spells, only attacks. **Blocker ward** — your next blocking unit takes zero damage from that fight but still deals its counter, a one-fight shield stamped at block time (Griff confirmed: the block still strikes back). Both are new prevention primitives (`wardHome` / `wardBlocker`): per-seat one-shot state on the board, consumed in combat resolution and cleared at the round boundary.
