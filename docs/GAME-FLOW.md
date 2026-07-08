# How the Game Plays — Prototype v0

*Written for the designer. This is the game as it exists at the table right now — every rule here is live in the prototype. Where the printed rules were silent or contradictory, the prototype makes a call and flags it with ⚑; the full list of calls (with reasons) is in `docs/DESIGN/DECISIONS.md`, and every affected card shows a small ⚑ flag in the Cards page with the ruling on hover. Nothing flagged is sacred — each one is a conversation starter, and most are one-line changes to revisit.*

---

## The shape of a game

Two players, two 48-card decks, three battle zones on a line:

```
[ Your Home ]  —  [ Neutral ]  —  [ Their Home ]
```

You win by **either**:

- **Life:** reduce your opponent to 0 Life (everyone starts at 20), or
- **Influence:** pull the shared Influence track to **+15 on your side**.

Influence is one number the two of you fight over — when you "gain 1 Influence," the marker moves one step toward your end. It starts at 0. This is the "anything can happen" mechanic: a player who's losing on Life can still be winning the argument.

## Setting up

Each player shuffles and draws 7, then **chooses 2 of them to bank** as face-up **resources**, first player choosing first (decision 31, 2026-07-08 — the first rules change made from live playtesting; the old zero-input auto-bank survives as a rules parameter for A/B tests). A coin flip picks who goes first; **the first player draws only 1 card on their first turn** as compensation (⚑ tunable parameter).

## A turn

1. **Reset** — pay 1 Influence for each enemy unit you hold imprisoned (⚑ the upkeep comes *before* anything else; see Prison below), your start-of-turn card effects fire, then all your cards ready.
2. **Draw 2.**
3. **Resource** — you may bank 1 card from hand, face up. It pays for cards from now on. Any card can be a resource; every resource is worth 1.
4. **Main phase — the interesting part.** You and your opponent **alternate taking single actions**, you first. When both of you pass back-to-back, the turn ends.

Your actions on your turn:
- **Play a card** — pay its cost by exhausting that many resources.
- **Move a unit** — one step along the line (Home ↔ Neutral ↔ their Home). Moving exhausts the unit. ⚑ *Movement is a prototype invention: the printed rules never say how units cross zones, and without it armies can never meet. A unit marches OR fights each turn, not both.*
- **Attack** — one ready unit attacks one target (see Combat).
- **Pass.**

Your **opponent**, in their alternating windows, may **play cards** (yes — units, actions, upgrades, all of it, on your turn ⚑) or pass, but cannot attack or move. This is the per-round interaction the GENESYS asks for — a Searing Bolt can land in the middle of your assault.

## Combat

An attack is **one attacker, one target**:

- A unit can attack an enemy unit **in its own zone**.
- It can attack the enemy **base** (the player) only while standing **in that player's Home zone** — you have to march there first.
- **Damage is simultaneous** — the defender always punches back with its full Power. Damage sticks between turns; units die when damage ≥ health.

The keywords, as implemented:

| Keyword | At the table |
|---|---|
| **Guard** | While a ready, free Guard unit stands in the contested zone, attackers must target it — the base included. |
| **Armor X** | Every hit on this unit is reduced by X (from any source). Armor from multiple sources adds up ⚑. |
| **Rush** | May attack *and move* ⚑ the turn it arrives (everyone else waits a turn). |
| **Breakthrough N** | Kill the blocker with damage to spare, and up to N of the excess hits the owner's Life — from any zone. |
| **Overextend N** | **The designer's own definition (decision 35):** an optional gamble taken with an attack — +N Power now, and the unit suffers N self-damage at end of turn. Printed on actions it's currently inert, pending the designer's card pass. |
| **Ranged** | May shoot into an adjacent zone; never the base; cross-zone shots draw no counter-damage ⚑. |
| **Flying** | ⚑ Placeholder: may move to *any* zone. Needs a real design. |

## Prison (Yellow's engine)

Imprisoned units stay on the board but can't attack, move, defend (no counter-damage), or use abilities — their Guard stops working, their auras go dark.

- Prisons from **units** (Containment Priest, Lawbringer…) break when the jailer unit leaves play.
- Prisons from **actions** persist — but every prisoner costs the jailer **1 Influence at the start of each of their turns** (v1.2's decay rule), and the moment the jailer's Influence goes **negative, every cell springs open** ⚑. Mass imprisonment is powerful and expensive — exactly the tension the rules gesture at.

## The two decks

- **Crimson Assault (Red):** rush, burn, breakthrough, and the Overextend gamble — power now, self-damage later. *Updated after designer session #1:* red no longer cedes influence at all; with the new economy (decisions 34–35) the simulations flipped from influence-dominated to combat-dominated — red wins ~30% of bot mirrors, nearly all by life. |
- **Radiant Order (Yellow):** walls, armor, prisons, and a steady trickle of Influence from nearly every card. Wins by inevitability — or by Life once its 0-power fortresses are joined by real attackers.

## What the simulation says (and doesn't)

Every test run plays **150 full games with random legal moves**. All 150 finish with a winner, no rule crashes, no cards lost or duplicated, and **both win conditions occur** (influence 87%, life 13%). Median game: 16 turns. That proves the machine works end-to-end; it does **not** prove balance — that's what your playtesting is for, and the harness is ready to grow policies smarter than random when we want numbers you can trust more.

## Changing the game (no code required)

From the **Admin** hall (admin account required):

- **Cards** — edit cost, power, health, name, and rules text on any card; new games pick up changes instantly (games in progress keep the cards they started with). The structured-effect editor is validated by the engine — an edit it can't execute is rejected on save, so a typo can't corrupt a game. New cards get procedural art automatically.
- **Rules** — every number above (starting life, win threshold, draws per turn, prison decay, first-turn draw…) lives in a named, versioned parameter set. Tweak, save as "v1.3-experiment," make it the default, and the next game plays by it.
- **Decks** — build or edit the shared prebuilt decks with a live legality meter.

## Open questions worth a session each

1. **The Influence economy** (above) — the prototype's biggest known imbalance.
2. **Movement** — is exhaust-to-move right? Should Neutral matter more (a contested prize?), should Home be safer?
3. **Off-turn plays** — full freedom feels wild; actions-only is the obvious alternative. (One checkbox in the engine.)
4. **The June spreadsheet's ideas** — the Stack, modal Action/Response cards, Momentum — none are in v1.2 or the printed decks, so none shipped. Adopt or archive?
5. **The ⚑ card rulings** — 20+ cards carry a prototype ruling (Radiant Citadel, Flying, Prison Warrant's "this zone," auto-picked imprison targets…). Each is listed in DECISIONS.md and flagged on the card itself.
