# New Game Rule Set — v1.3 (2026-07-16)

> v1.3 supersedes v1.2. Originally extracted 2026-07-07 from `docs/REFERENCES/New Game Rules 1.2 July 3, 2026.docx`; the Combat section was revised 2026-07-16 to match current play and moved up to follow Turn Structure. **This is the authoritative rules document**; earlier versions are superseded. If anything here looks off, check the original docx.

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

**3. Unit vs base.** One ready unit, standing in the enemy's Home zone, attacks the base. **The base does not retaliate** — an unblocked hit is simply damage to Life. But the Home is everyone's to defend: **any** ready unit in the home zone may block a base attack, even a lone one — this is the one place the lone-duel rule below does not bind.

> Example: your 4/3 Vanguard stands in their Home and swings at the base. Unblocked: they lose 4 Life, your Vanguard is untouched. But their ready 1/1 Squire may step in front: the Squire takes 4 and dies, deals 1 back (Vanguard now 4/2), and the base takes nothing. One small unit, four Life saved.

**4. Gang vs base.** Several ready units in the enemy's Home attack the base together. The defender may block each attacker individually with a ready home unit. Every unblocked attacker deals its Power to Life; every blocked pair trades under retaliation-always.

> Example: your 2/2 Raider, 3/3 Marauder, and 4/4 Brute attack the base (no enemy Guard in the zone). The defender blocks the Brute with a ready 3/3 Sentry and the Marauder with a ready 1/1 Squire. Resolution, all at once: Sentry and Brute trade — Sentry deals 3 (Brute to 4/1), takes 4, dies. Squire and Marauder trade — Squire deals 1 (Marauder to 3/2), takes 3, dies. The Raider is unblocked: base takes 2. The defender turned 9 incoming Life damage into 2, at the price of two units — and chipped two attackers doing it.

### Exceptions and fine print

- **Retaliation is always.** The rule under everything: when a unit attacks a unit, or a blocker blocks an attacker, both deal full Power simultaneously — exhausted or not. The only thing in the game that does not hit back is the base.
- **Guard is a shield, not a gate.** Guard does not force the enemy to attack it first — an attacker may swing past it at any unit or the base. What Guard does is defensive: it is the only unit that may step in front of a *lone* attacker aimed at one of your units (the lone-duel rule below), and it blocks without exhausting.
- **The lone-duel rule.** If exactly one unit attacks a *unit*, only a **Guard** may block it — a lone duel is answered by a Guard or not at all. The single exception: a lone attacker on the *base* may be blocked by any ready home unit.
- **Who may block.** A blocker must be the defender's own unit, ready (a unit that attacked this round is exhausted and cannot also block), not imprisoned, and standing in the combat zone. **Blocking exhausts the blocker — unless it is a Guard, which stays ready after blocking.**
- **Everything is chosen up front.** Attackers, target, any secondary target (a splash or skewer pick), blocker pairings, and the split and order of a divided retaliation are all set before damage resolves. Once combat resolves there is no further input. This keeps combat fast and dispute-free.
- **Divided retaliation.** A ganged unit retaliates once, its Power divided among the attackers that hit it; the defender chooses the order it is dealt. Default: highest Power first.

### Combat keywords

Guard, Armor, Shielded, and Breakthrough are combat keywords. Each is defined once — with the rest of the game's shorthand — in the **Keywords / Mechanics** glossary near the end of this document.

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

The game's shorthand, gathered in one place. Each term is defined once here, in present tense; a card that prints a keyword uses exactly this meaning.

### Core states

- **Ready** — Not yet spent this round. A ready unit can attack, move, or block; a ready resource can help pay a cost. Units enter play ready, and everything readies at the start of its owner's round.
- **Exhausted** — Spent for the round (tapped). A unit exhausts when it attacks or moves; a resource exhausts when it pays toward a cost. An exhausted unit can't attack, move, or block, and readies at the start of its owner's next round. (It still strikes back when attacked — retaliation is always; see Combat.)
- **Attacker** — A ready unit you exhaust and declare in an attack. One or more attackers in the same zone strike together as a single action.
- **Blocker** — A ready unit the defender pairs onto a specific attacker to stop it. Blocking exhausts the blocker unless it is a Guard. A lone attack on a unit can be blocked only by a Guard; a lone attack on a base may be blocked by any ready unit in the home zone.

### Combat keywords

- **Guard** — The only unit that may block a lone attacker aimed at one of your units, and it blocks without exhausting, so it can block and still take its own turn. Guard is purely defensive: it does not force the enemy to attack it first.
- **Armor X** — Reduces every hit this unit takes by X, each hit judged on its own. A 3-damage hit against Armor 2 deals 1; five separate 1-damage hits deal 0.
- **Shielded** — Enters play carrying a shield token. The first hit it would take is prevented in full, then the token is spent — one free save, against a hit of any size.
- **Breakthrough** — When this attacker kills its blocker, the leftover damage spills through to what it was attacking: a unit, or — striking from inside the enemy Home — on past a slain unit into the base. No cap, so a chump block doesn't stop it.

### Abilities & attacks

- **Rush** — A static ability: this unit may move one zone each round for free, without exhausting. It does not grant an extra action and does not let the unit attack any sooner. (Being finalized in the current rework.)
- **Ranged N** — An ability used as your action: exhaust this unit to deal N damage to one enemy unit in any zone (a volley). It is a chosen shot, so a ready Hidden unit can't be picked, and a lethal volley counts as a kill. The unit's ordinary attacks are unchanged — same zone, blockable, and able to hit the base.
- **Sneak** — An ability used as your action: exhaust this unit to resolve its printed Sneak effect on a target in its own zone (a unit or the base). Each card spells out what its Sneak does.
- **Infiltrate** — This unit may be played into any zone, not just your Home.
- **Flying** — When it moves, this unit may go to any zone, not only an adjacent one.
- **Scar** — This unit gets +1 Power for each point of damage marked on it, with no cap — the closer to death, the harder it hits.

### Identities, control & protection

- **Hidden** — While this unit is ready, enemy effects can't target it and enemy attacks can't be declared at it. It can still block. Anything that exhausts it — attacking, blocking, a Sneak — reveals it until it readies again. Effects that don't choose a target (whole-zone or "all" damage) still reach it.
- **Untargetable** — Enemy effects can't choose this unit as a target. Unlike Hidden, it can still be attacked.
- **Can't-attack** — This unit is never a legal attacker (some walls print it; some enemy effects impose it for a round). It can still move and block.
- **Capture** — This unit takes an enemy unit under itself, off the board entirely. The captive drops its upgrades in the zone it held — they orphan there, salvageable, the same as when a unit falls. No action can free the captive; it returns — ready, to that zone, and without its old upgrades — only when the capturer leaves play. Some captures also pay their holder Influence each round while the grip holds.
- **Prison / Imprison** — Yellow's control tool. An imprisoned unit stays on the board but goes inert: it can't attack, move, block, use abilities, or strike back. Holding prisoners is a mortgage — at the start of each round the jailer loses 1 Influence per prisoner, and a prisoner is freed the moment the jailer's Influence drops below 0 or the effect that jailed it leaves play. (Distinct from Capture, which removes the unit from the board.)
- **Politician** — At the end of each round, if this unit stands in Neutral and its owner holds more units there than the opponent, its owner gains 1 Influence — once per round, however many politicians are present.
- **Influence-on-defend** — Not a keyword but yellow's signature triggered effect: many yellow units gain Influence when they defend (some when they block or are attacked, some once per attacker). It turns defending into progress on the Influence track; each card prints its own version.

### Cross-references

- **Influence** — The single shared track both players fight over (starts at 0). Gaining Influence pulls the marker toward your side; reaching the win threshold in your favor takes the game even while you are behind on Life. See **Game Concepts** for the exact win values.
- **Zones / Home / Neutral** — Units live in one of three zones: your Home, Neutral, the opponent's Home. Combat happens inside a single zone (the one exception is a Ranged volley). Full detail in **Zones**, above.
- **Upgrades** — Attach to a unit to grant bonuses or abilities; a few clamp onto an enemy to weaken it. See **Card Types**. (The old "upgrade pressure" tax — the opponent gaining Influence for each upgrade beyond the first — is not part of the current rules.)

### Legacy (classic v2.3 only)

These print on some older cards but have no effect in the current combat model; they act only under the classic v2.3 rules.

- **Reach** — Attacks a unit in an adjacent zone as an ordinary attack.
- **Overextend N** — An optional attack-time gamble: +N Power now, N self-damage at end of round.
