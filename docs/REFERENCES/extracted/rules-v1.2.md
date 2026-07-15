# New Game Rule Set — v1.2 (July 3, 2026)

> Extracted 2026-07-07 from `docs/REFERENCES/New Game Rules 1.2 July 3, 2026.docx` (full text, light markdown formatting only — no content changes). **This is the authoritative rules document**; "New Game Rules v1 June 2026" is superseded. If anything here looks off, check the original docx.

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

- **Combat Phase**
  - Attacking Player declare attacking unit/units and exhausts them (them cannot already be exhausted)
  - Attacking Player declares units being attacked (can be any unit in the same zone)
  - Damage is dealt simultaneously
- **End Phase**
  - Resolve "end of turn" effects

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

- **Guard** — Must be attacked before non-Guard units or the base
- **Armor X** — Reduces incoming damage by X
- **Rush** (Red) — Can attack the turn it is played
- **Breakthrough** (Red) — Excess damage to defending unit is dealt to opponent's Life
- **Overextend** (Red) — Gains bonus when attacking alone
- **Ranged** (Blue)
  - Can attack enemy units in adjacent zones only
  - Cannot target bases
  - Must exhaust to use
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
