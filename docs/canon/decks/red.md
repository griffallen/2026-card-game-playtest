# Red Deck Charter

*One of the card pool's two parents: every red card must obey this charter **and** the base rules
(`docs/rules.md`). A card that breaks a law here is a review-blocker, whatever its numbers.*

## Identity

**Red spends its own blood for tempo.** It wins by ending the game before inevitability arrives —
rushing units up the board, trading recklessly, and converting every resource (life, unit health,
board position) into damage *now*. Red's losses come from overreaching; that's not a bug, it's the
deck's signature. Red wins by **Life**, never by Influence.

## Keywords red may print

| Keyword | What it means for red | Limits |
|---|---|---|
| **Rush** (7 cards) | The tempo engine: the unit's first move each round is free. | Red's signature; cheap units first. |
| **Breakthrough** (7 cards) | Kills must convert to face damage — red hates walls. | No number, no cap: everything past a slain blocker spills. |
| **Scar** (4 cards) | The gamble, reshaped: +1 Power per damage marked, uncapped (decision 94). | Red's wound-fuel identity — Overextend's successor. |

**Forbidden:** Armor, cantAttack, Hidden, Infiltrate, Sneak, Ranged, Capture, Politician. Red
doesn't defend, hide, shoot from safety, or campaign — it closes distance and swings.

*Retired, never to return without a fresh ruling:* **Overextend** (cut; Scar carries the flame —
decisions 70→94) and **Reach** (cut on issue #8). Neither appears on any card.
*One sworn exception (designer, PR #31, 2026-07-12): **Spark Hound** carries Guard — "they look
like guard dogs." Flavor may overrule the law, but each new exception is ratify-first.*

## Invariants (the design laws)

1. **Red never gains Influence.** No red card moves the shared track toward red's side — not on
   kill, not on play, not ever. (Ceding Influence *to the opponent* as a printed cost is legal
   charter space — it's the original "burn your standing" idea — but no current card uses it.)
2. **Scar is a unit keyword, never printed on actions or upgrades** (decision 47's rule, inherited
   from Overextend).
3. **Every discount has a visible cost.** A red card that beats the statline grammar or the
   damage-per-cost norm must print what it charges you: self-damage, a Scar body that must be
   wounded to pay off, a dead-end board state. No free power.
4. **Red does not heal** — not units, not its base. Damage taken is the price already paid.
5. **Red does not Capture.** Taking prisoners is yellow's law, not red's.
6. **Red's removal is damage — or an execute that finishes a fight.** Destroy-effects are legal
   only against *damaged* units (Execution Swing); unconditional destroy or exile is forbidden.

## Curve & size (the standard base set)

- **36 uniques** (15 units / 19 actions / 2 upgrades) + a second copy of the twelve cheapest
  workhorses = the 48-card *Crimson Assault* deck.
- Cost histogram (uniques): `1:4 2:6 3:5 4:6 5:5 6:4 7:4 8:2` — flat, aggressive, playable from
  round one.
- **Statline grammar:** a unit's Power + Health = **2 × cost**, ±1; keywords and triggers eat the
  "+1". **Power ≥ Health** on at least two-thirds of units — red leads with the blade.
  Deviations must be the card's stated point (a wall-shaped red unit is a design smell).
- Actions: damage-per-cost norm is **cost + 1** damage single-target (Devastating Strike: 1 mana,
  2 damage), less when it also buffs or draws.

## Influence posture

Red mostly pretends the track doesn't exist — and must. Its only legal relationship with
Influence is *paying* it to the opponent as a cost. If red can win by Influence, the charter is
being violated somewhere.

## Provisional / open

- The twelve-doubles deck rule (decision 25) is a prototype convenience — real deckbuilding rules
  replace it eventually.
