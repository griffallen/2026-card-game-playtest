# How the Game Plays — Prototype v2.0

*Written for the designer. This is the game as it exists at the table right now — every rule here is live in the prototype (turn-structure v2.0: shared rounds, claimable initiative, multi-unit attacks with a defender's intercept). Where the printed rules were silent or contradictory, the prototype makes a call and flags it with ⚑; the full list (with reasons) is in `docs/DESIGN/DECISIONS.md`, and every affected card shows a small ⚑ flag in the Cards page with the ruling on hover. Nothing flagged is sacred — each one is a conversation starter.*

---

## The shape of a game

Two players, two 48-card decks, three battle zones on a line:

```
[ Your Home ]  —  [ Neutral ]  —  [ Their Home ]
```

You win by **either**:

- **Life:** reduce your opponent to 0 Life (everyone starts at 20), or
- **Influence:** pull the shared Influence track to **+15 on your side**.

Influence is one number the two of you fight over — when you "gain 1 Influence," the marker moves one step toward your end. It starts at 0. This is the "anything can happen" mechanic: a player losing on Life can still be winning the argument.

## Setting up

Each player shuffles and draws 7, then **chooses 2 of them to bank** as face-up **resources**, initiative-holder choosing first (decision 31 — the old zero-input auto-bank survives as a rules parameter for A/B tests). A coin flip picks who holds the **initiative** to start. Both players draw the same amount every round — the old "first player draws one fewer" compensation is gone (decision 44), because the new round structure already dissolves the first-mover edge (see below).

## A round (decision 40 — this replaces per-player turns)

The game is played in **rounds** — a shift from the old per-player-turn structure. Within a round, players take **turns** (a turn = one action). A round has two parts.

**1. Start steps — each player, initiative-holder first.** Automatic, except the one choice noted:
- Pay 1 Influence for each enemy unit you hold imprisoned (⚑ this upkeep comes first; see Prison).
- Your start-of-round card effects fire.
- **All your cards ready.** *(Both players untap every round now — not just the active player, as in the old turn model.)*
- **Draw 2.**
- **Bank** — you may put 1 card from hand face-up as a resource, or skip.

**2. The action loop — the interesting part.** The initiative-holder takes the first turn, then you **alternate turns** (one action each). There's no "active player" anymore — on *your* turn you have the **full menu**:
- **Play a card** — pay its cost by exhausting that many resources.
- **Move a unit** — one step along the line (Home ↔ Neutral ↔ their Home); moving exhausts the unit. ⚑ *Movement is a prototype invention — without it armies never meet. March OR fight, not both (unless you have Rush).*
- **Attack** — one or more of your ready units in a single zone strike together (see Combat).
- **Claim the initiative** (see below).
- **Pass.**

**Passing is soft:** if your opponent takes a turn after you pass, your turn comes back around. **Two passes in a row end the round.** Then the next round's start steps begin — and **the initiative carries over to whoever held it, unless someone claimed it.**

**Claiming initiative** is its own action: you take the initiative token, and you're **done acting for the rest of this round** (your opponent plays on solo until they pass). In exchange, you act **first next round**. It's a real tempo decision — bail out of a round early to guarantee the opening move of the next one. Either player may claim (including the current holder, to lock it in), but only once per round.

*(Why this kills the first-mover edge: acting first is balanced by the claim costing you your whole remaining round, and by strict alternation. Bot mirrors now win 50/50 regardless of who starts — see the simulation note.)*

## Combat (decision 42 — massing attackers, and a defender's choice)

An attack is **one action** in which **one or more of your ready units, all in the same zone, strike one target together**:

- They can hit an enemy **unit in their zone** (or, if *every* attacker has Ranged, an enemy unit one zone over).
- They can hit the enemy **base** (the player) only while standing **in that player's Home zone**.
- Declaring an attack **exhausts every attacker**.

Then the **defender gets one choice — the intercept window:**
- They may **redirect the whole attack onto one of their own ready units** in the target's zone (a bodyguard steps in), or **let it through**.
- Intercepting **exhausts** the interceptor — **unless it has Guard**, which steps in for free.

**Resolving:**
- The attackers' **combined Power lands as one hit**; the target's Armor is subtracted **once** — so **massing attackers is the designed answer to a big Armor wall** (five 1-Power units now beat Armor 4, where before each bounced off).
- The final target, if a unit, **punches back once** — its full Power hits the **single biggest attacker** (a base punches back nothing).
- **Breakthrough** excess (summed across the attackers that have it) spills over a killed unit into its owner's Life.

⚑ **Guard changed:** it no longer *forces* you to attack it. Protection is now the defender's decision, made in the intercept window. A guard wall doesn't stop you from marching at the base — but the defender can throw a guard in front, for free, when you do.

The keywords, as implemented:

| Keyword | At the table |
|---|---|
| **Guard** | Can **intercept an attack without exhausting**. No longer forces targeting. |
| **Armor X** | Every hit on this unit is reduced by X. Against a group, applied once to the combined hit. Multiple sources add up ⚑. |
| **Rush** | The round it arrives, its **first move doesn't exhaust it** (one free reposition) — so it can move and still fight; a second move exhausts it like any unit (decision 41). Units otherwise enter **ready** now: no summoning sickness — a fresh unit can already act (moving/attacking exhausts it as normal). |
| **Breakthrough N** | Kill the target with damage to spare and up to N of the excess hits the owner's Life. In a group, the attackers' Breakthrough values sum. |
| **Overextend N** | The designer's gamble (decision 35): declared per attacking unit — +N Power now, N self-damage at **end of round**. **Units only** (decision 47) — it no longer appears on actions. |
| **Ranged** | May shoot into an adjacent zone; never the base; cross-zone shots draw no counter-damage ⚑. |
| **Flying** | May move to *any* zone, ignoring adjacency (decision 48). |

## Prison (Yellow's engine)

Imprisoned units stay on the board but can't attack, move, defend (no counter-damage — and they can't intercept), or use abilities; their Guard goes dark.

- Prisons from **units** (Containment Priest, Lawbringer…) break when the jailer unit leaves play.
- Prisons from **actions** persist — but every prisoner costs the jailer **1 Influence at the start of each round** (v1.2's decay rule), and the moment the jailer's Influence goes **negative, every cell springs open** ⚑. Mass imprisonment is powerful and expensive.

## The two decks

- **Crimson Assault (Red):** rush, burn, breakthrough, and the Overextend gamble. *Under v2.0 the economy shifted again:* both players now draw every round and guard walls no longer auto-block, so red's aggression breathes — it wins **~36% of competent bot mirrors**, almost entirely by Life. *(v2.1's one-free-move Rush cap pulled this down from ~46% — red leaned on unbounded repositioning; a rebalance candidate now that Rush is tightened.)*
- **Radiant Order (Yellow):** walls, armor, prisons, and a steady trickle of Influence. Its fortress plan is deliberately weaker now that Guard is optional interception rather than a hard wall — it has to actually contest the board, not just sit.

## What the simulation says (and doesn't)

Every test run plays **150 full games with random legal moves** — all finish with a winner, no rule crashes, no cards lost or duplicated, both win conditions reachable. The picture is **combat-dominated**: the large majority end on Life (influence upsets run ~5–13% depending on the batch), median ~19 rounds under random play. With the competent (heuristic) bot mirroring itself: **red ~36% / yellow ~64%, ~96% by Life, first-mover 50/50, median 11 rounds** (v2.1 — capping Rush at one free move dropped red ~10 points from v2.0's ~46%). That proves the machine works and that decision 44 dissolved the first-player edge — it does **not** prove balance. That's what your playtesting is for.

## Changing the game (no code required)

From the **Admin** hall (admin account required):

- **Cards** — edit cost, power, health, name, text, keywords, and the influence-trigger on any card; new games pick up changes instantly (games in progress keep the cards they started with). Validated by the engine — an edit it can't execute is rejected on save, so a typo can't corrupt a game. *(The same pool is editable card-by-card as files in `data/cards/`, straight on GitHub — decision 46; see `data/cards/README.md`.)*
- **Rules** — every number above (starting life, win threshold, draws per round, prison decay, and the new v2 levers — `rushCoversAttack`, `interceptExhausts`, `maxAttackers`…) lives in a named, versioned parameter set. Save as "v2.1-experiment," make it default, and the next game plays by it.
- **Decks** — build or edit the shared prebuilt decks with a live legality meter.

## Open questions worth a session each

1. **Does claiming initiative feel good?** The new tempo lever — watch whether players use it, and whether "first next round" is worth a whole round's actions.
2. **Intercepts** — is one redirect per attack the right amount of defender agency? Does free Guard-interception make yellow too sticky, or not sticky enough?
3. **The Influence economy** — still rare (4–6% of games). Is that the intended "upset" frequency, or should Yellow's trickle bite harder?
4. **Base/home naming** — still "base"; the designer floated Banner/Hearth/Seat/Beacon.
5. **Prison's fate** — kept but "on notice" (decision 37).
6. **The ⚑ card rulings** — 20+ cards carry a prototype ruling; each is in DECISIONS.md and flagged on the card. The designer's CSV card pass is the place to normalize them.
