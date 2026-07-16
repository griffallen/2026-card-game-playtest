# New Game Rule Set — v1.2 (July 3, 2026)

> Extracted 2026-07-07 from `docs/REFERENCES/New Game Rules 1.2 July 3, 2026.docx` (full text, light markdown formatting only — no content changes). **This is the authoritative rules document**; "New Game Rules v1 June 2026" is superseded. If anything here looks off, check the original docx.
>
> Combat section revised 2026-07-16 to match current play and moved up to follow Turn Structure.

## Game Concepts

Win conditions:

- Opponent's Life reaches 0
- Influence reaches +20 in their favor
- Influence reaches -15 in their opponent's favor

These conditions are meant to represent a different play experience than all current deckbuilders. I want the game to be fun for all and reward those with skill. Often, I've found that other deck building games become inevitable. I want my game to feel like anything can be possible. That is the intention of the influence mechanic. It's meant to balance the game while still allowing for win conditions to take their course. Cards should use life and influence to help keep the game interesting, fun and with a feeling of 'anything can happen'.

Influence is a shared value between both players and acts as a secondary win condition.

- The game starts at 0 Influence
- If Influence reaches +20, the controlling player wins
- If Influence reaches -15, the opposing player wins

## Cards and Deck

- Decks should have at least 48 cards
- They can consist of up to 4 of any one card

## Setup

Each player starts with:

- 20 Life (tracked individually)
- Shared Influence total starts at 0
- Draw 7 cards then resource 2 cards face up

## Zones

There are three zones of play.

- Home (close to each player)
- Neutral
- Opponent

Units exist within zones. Combat occurs within the same zone unless using 'Ranged' ability.

There are other zones out of play.

- **Discard** — Action and Event cards are placed here after they are played. Units and Upgrades are placed here after they are destroyed.
- **Resource** — Once a card is resourced, it must be placed in this zone and does not leave this zone unless directed by another card or action. Cards may be played face-up to take advantage of their resource symbol. If a card is played face down, it can still be used to pay for a card, but it will only count as generic resource value.

## Turn Structure

- **Reset Phase**
  - Resolve "start of turn" effects
  - Ready or Untap all exhausted cards
- **Draw Phase**
  - Draw 2 cards
- **Resource Phase**
  - You may, but are not required to, place 1 card from your hand face up as a resource in your resource zone
- **Main Phase**
  - Play units, actions, and upgrades
  - Activate abilities
  - Exhaust units or resources to pay costs

During the Main Phase, each player alternates taking an action. An attack is one action, playing a card is one action, passing is one action.

- **End Phase**
  - Resolve "end of turn" effects

Attacking is one of the actions a player may take during the Main Phase — see the Combat section immediately below.

## Combat

### Combat at a glance

Combat happens inside a single zone — a unit can only attack something standing in its own zone, and to threaten the enemy base it must first advance into their Home. An attack is **one action**: you exhaust one or more of your **ready** units (a unit that has not yet exhausted this round) as **attackers** and name one **target** — an enemy unit in the zone, or the enemy base. The defender then assigns **blockers**, pairing each blocker onto one specific attacker. Then everything hits at once: each blocked attacker trades blows with its blocker, each unblocked attacker hits the target, and **every unit that gets hit hits back at full Power — simultaneously**. Only the base never hits back. Every choice is made before damage resolves; nothing is decided mid-combat.

Those three steps — declare, block, resolve — settle every fight. What follows is the four kinds of attack in detail, then the exceptions.

### The four kinds of attack

**1. Unit vs unit.** One ready unit attacks one enemy unit in its zone. Both deal their Power to each other at the same time — the defender strikes back at full Power even if it is exhausted. Armor and Shield apply to each hit. Either unit, or both, may die.

> Example: your 3-Power / 2-Health Berserker attacks their 5-Power / 6-Health wall. Damage is simultaneous: the wall takes 3 (down to 3 Health), your Berserker takes 5 and falls. You paid a unit for 3 damage — attacking is never free. The question before every swing is: does my unit survive the counter?

**2. Gang vs target.** Several ready units attack one enemy unit together — all declared in the same action, all exhausted by declaring. The defender may pair blockers onto individual attackers; each blocked pair trades separately. Every unblocked attacker lands on the target, and the target retaliates **once**, its Power **divided** among the attackers that reached it — the defender chooses how to split and order that retaliation (default: highest Power first).

> Example: your 2/2 Raider and 3/3 Marauder gang their 4/5 Warden. No blocks. The Warden takes 2 + 3 = 5 and dies — but damage is simultaneous, so it still retaliates: 4 Power divided, defender's choice of order. Default: 3 to the Marauder (dies), the remaining 1 to the Raider (now 2/1). You killed the Warden; it took your Marauder with it. Had the defender instead blocked the Marauder with a ready 2/3 Sentry, the Marauder and Sentry would trade with each other, and only the Raider's 2 would land on the Warden.

**3. Unit vs base.** One ready unit, standing in the enemy's Home zone, attacks the base. **The base does not retaliate** — an unblocked hit is simply damage to Life. But the Home is everyone's to defend: **any** ready unit in the home zone may block a base attack, even a lone one — this is the one place the lone-duel rule below does not bind. The Guard gate still applies: if the defender has a Guard in the zone, you must attack the Guard before you may attack the base.

> Example: your 4/3 Vanguard stands in their Home and swings at the base. Unblocked: they lose 4 Life, your Vanguard is untouched. But their ready 1/1 Squire may step in front: the Squire takes 4 and dies, deals 1 back (Vanguard now 4/2), and the base takes nothing. One small unit, four Life saved.

**4. Gang vs base.** Several ready units in the enemy's Home attack the base together. The defender may block each attacker individually with a ready home unit. Every unblocked attacker deals its Power to Life; every blocked pair trades under retaliation-always.

> Example: your 2/2 Raider, 3/3 Marauder, and 4/4 Brute attack the base (no enemy Guard in the zone). The defender blocks the Brute with a ready 3/3 Sentry and the Marauder with a ready 1/1 Squire. Resolution, all at once: Sentry and Brute trade — Sentry deals 3 (Brute to 4/1), takes 4, dies. Squire and Marauder trade — Squire deals 1 (Marauder to 3/2), takes 3, dies. The Raider is unblocked: base takes 2. The defender turned 9 incoming Life damage into 2, at the price of two units — and chipped two attackers doing it.

### Exceptions and fine print

- **Retaliation is always.** The rule under everything: when a unit attacks a unit, or a blocker blocks an attacker, both deal full Power simultaneously — exhausted or not. The only thing in the game that does not hit back is the base.
- **The Guard gate.** If the defender has any Guard unit in the zone, attackers must target a Guard before any non-Guard unit or the base. Guard is a targeting gate, not a damage reducer.
- **The lone-duel rule.** If exactly one unit attacks a *unit*, only a **Guard** may block it — a lone duel is answered by a Guard or not at all. The single exception: a lone attacker on the *base* may be blocked by any ready home unit.
- **Who may block.** A blocker must be the defender's own unit, ready (a unit that attacked this round is exhausted and cannot also block), not imprisoned, and standing in the combat zone. **Blocking exhausts the blocker — unless it is a Guard, which stays ready after blocking.**
- **Everything is chosen up front.** Attackers, target, any secondary target (a splash or skewer pick), blocker pairings, and the split and order of a divided retaliation are all set before damage resolves. Once combat resolves there is no further input. This keeps combat fast and dispute-free.
- **Divided retaliation.** A ganged unit retaliates once, its Power divided among the attackers that hit it; the defender chooses the order it is dealt. Default: highest Power first.

### Combat keywords

- **Guard** — enemies must attack it before non-Guards or the base; the only unit that may block a lone attack on a unit; stays ready after blocking.
- **Armor X** — reduces every hit this unit takes by X. A hit of 3 against Armor 2 deals 1; five separate 1-damage hits deal 0.
- **Shield** — absorbs one whole hit of any size, then is gone.
- **Breakthrough** (Red) — if this attacker's damage exceeds its blocker's remaining Health, the excess spills through to the opponent's Life. A normal 5-Power attacker is stopped cold by a 1-Health chump; with Breakthrough, 1 kills the chump and 4 spill through.
- **Rush** (Red) — affects when a unit may attack. Its exact wording is being finalized, so it is not pinned here.

## Card Types

- **Units** — These cards can have one or more abilities and costs.
  - Attack
  - Health
  - Armor
  - May have keywords or triggered effects
- **Actions**
  - One-time effects, then discarded
- **Upgrades**
  - Attach to units to grant bonuses or abilities
  - May alternatively be played for their action effect (choose one mode when played)

## Keywords / Mechanics

- **Guard** — Must be attacked before non-Guard units or the base; stays ready after blocking. See the Combat section.
- **Armor X** — Reduces every hit this unit takes by X.
- **Shield** — Absorbs one whole hit of any size, then is gone.
- **Rush** (Red) — Lets a unit attack the turn it is played. Being reworked toward a per-round attribute; wording not final.
- **Breakthrough** (Red) — When an attacker's damage exceeds its blocker's remaining Health, the excess spills through to the opponent's Life.
- **Ranged** (Blue) — An ability, not an attack style: exhaust this unit to deal N damage to one enemy unit in any zone (a volley). The unit's regular attacks are ordinary — same zone, blockable, may hit the base.
- **Influence Triggers** (Yellow Identity) — Common patterns:
  - When this unit defends, gain 1 Influence
  - Exhaust: Gain 1 Influence
  - Conditional end-of-turn Influence gain

### Prison (Control Mechanic)

Prison removes enemy units from active play.

Imprisoned Units:

- Cannot attack, defend, or use abilities
- Remain in play but inactive

Release Conditions:

- If the controlling player's Influence falls below a threshold specified by the prison effect
- If the source of the prison effect leaves play

Prison Decay Rule:

- At the start of your turn: lose 1 Influence for each unit you have imprisoned

### Upgrades

- Attach to units to grant bonuses or abilities

Upgrade Pressure Rule:

- For each upgrade on a unit beyond the first: the opponent gains 1 Influence when that upgrade is played
