---
name: Worldrender
type: unit
cost: 8
power: 4
health: 8
keywords: rush, breakthrough, scar
pips: red, red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"startOfRound":{"ops":[{"op":"damage","t":"selfBase","n":1},{"op":"influence","n":-1},{"op":"damage","t":"self","n":1}]}}
---
Rush. Breakthrough. Scar. At the start of each round, lose 1 Life, lose 1 Hope, and deal 1 damage to this unit.

## Design notes

2026-07-11 (v3 churn pass 1): Overextend is cut (#9); the apex predator: 9/8, Breakthrough, Scar — a wounded god hits harder (to a survivor's limit).

2026-07-16 (#107, Griff's locked spec): 4/8 keeps Breakthrough + Scar, gains Rush and a pierce. Rush is just the keyword for now (its rework is #105) — a free first reposition the round it lands. The pierce: whenever Worldrender deals COMBAT damage to an enemy unit, that enemy's Shield and Armor are ignored and Worldrender's full Power lands. It does NOT strip those keywords (other attackers still meet the shield/armor, and the shield token is not spent) — Worldrender alone is unaffected by them. New engine flag `piercesArmorShield` on the card, read live in both combat resolvers via a pierce path on `damageUnit`; nothing changes for any other unit's shield/armor.
