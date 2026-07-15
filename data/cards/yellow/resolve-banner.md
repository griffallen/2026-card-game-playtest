---
name: Resolve Banner
type: upgrade
cost: 4
pips: yellow, yellow
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"statics":[{"s":"aura","scope":"friendlyInZone","p":1},{"s":"aura","scope":"attached","h":1,"armor":1}],"attach":{"side":"friendly","pass":2,"salvage":"freeFriendly"}}
---
Attach to unit. This unit gains +1 Health and +1 Armor. Other friendly units in this zone get +1 Power. If this becomes unattached, it can be picked up for 0 resources by a friendly unit. This can't be picked up by an opponent. This upgrade can be passed to a friendly unit in the same zone for 2 resources as an action, any number of times.

## Design notes

Session 006: 6 → 4 mana (red gets the same aura board-wide ON a 5/5 body for 6 — Warlord Garok).

#86 (Griff, ratified): the banner grew from a bare +Power aura into a movable rallying standard. It now buffs its bearer (+1 Health, +1 Armor) on top of the zone aura, and — the new part — can march: an attached banner can be **passed** to another friendly unit in the same zone for 2 resources, as an action, any number of times per round (tempo self-regulates the loop). When its bearer falls, the banner lies where it dropped and only a friendly unit may take it back up, for free — an opponent can't claim it. The +1 Health is real stock: a unit standing only because of the banner falls the instant it leaves (passed away, or lost with its bearer). First mover engine work: upgrade-granted Health, per-card salvage rules, and the pass-as-action primitive (`passUpgrade`).
