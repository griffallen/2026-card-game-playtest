---
name: Phantom Duelist
type: unit
cost: 4
power: 4
health: 1
keywords: hidden
pips: purple, purple
status: canon
art: /cards/phantom-duelist.jpg
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"dodgesWeakerCombatant":true}
---
Hidden. When this unit attacks or blocks, it takes no return damage from a weaker foe — its power must be greater (a gang's combined power counts; ties hit). When an enemy attacks it, it dodges nothing.

## Design notes

2026-07-11 (v3 churn pass 2, charter #10: reactive control): untargetable maps 1:1 onto Hidden — same fantasy, now with the self-revealing rhythm (decision 59).

2026-07-19 (#122): sharpened into a 4/1 glass-cannon duelist. Health 2 → 1, keeps Hidden, and gains dodgesWeakerCombatant: whenever it strictly out-powers the combatant it faces (effective Power), it takes NO reciprocal combat damage — walks through weaker blockers and weaker targets' retaliation untouched, and dodges a weaker attacker's counter when it blocks. Applies both directions; ties (equal power) still take the hit. It is NOT protected as the passive sieged target: a gang that attacks it directly still fells the 1-health body. New engine flag dodgesWeakerCombatant (mirrors piercesArmorShield), guarding the three reciprocal-damage sites in the v3 blocker-pairing resolver.

2026-07-21 (#141): reworded the printed text to say plainly WHEN the dodge applies — it fires when the Duelist attacks or blocks (a gang's combined power counts; ties land), and never when it is the passive attacked target. Prompted by Griff seeing it take damage: the block-dodge works, but it needs to STRICTLY out-power the foe (his own #98 game: the 4-power Duelist took a hit blocking a 5-power Blaze Juggernaut). No functional change — the dodgesWeakerCombatant flag is untouched (Griff: "keep the function the same," approved this wording).
