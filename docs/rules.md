<!-- GENERATED FILE — do not edit.
     Source: apps/demo/src/pages/Rules.tsx (the rulebook players read on the demo).
     Regenerate: npm run rules:doc -->

# How to Play

*Rules version **3.2.0** — the same number as the engine package, bumped on every combat-behaviour change (issue #119).*

Everything you need to sit down and play, the game as it stands today. Want to try it while you read? The [Play](https://booherbg.github.io/new-game-demo/#/play) tab runs the full rules in your browser, and every card’s exact text is in the [Cards](https://booherbg.github.io/new-game-demo/#/cards) tab.

> **The one-minute version.**
>
> Two players, two decks. You each start at **20 Life**. Play units into three zones, march them at your opponent, and attack — reduce their Life to **0** to win. Or win the other way: tug the shared **Influence** track to **+20 on your side**. Players take turns — single actions — across shared rounds. That’s the whole shape; the rest is detail.

## Winning the game

You win the instant either of these happens (checked after every single change):

- **Life:** your opponent’s Life hits **0**.
- **Influence:** the shared track reaches **+20 on your side**. One number sits between you; pulling it to your end wins — even if you’re behind on Life.

If a single event would drop both players to 0 Life at once, the player who took the action wins.

## The board

Three zones sit in a line. Units march one step at a time between them:

> ```
> [ Your Home ] — [ Neutral ] — [ Their Home ]
> ```

- **Adjacent** zones are the ones touching on the line. The two Home zones are **not** adjacent to each other — you have to cross Neutral.
- Your **base** is you. It lives in your Home zone; damage to it is Life damage. An enemy can only attack your base from **inside your Home zone**.
- Off to the side you keep your **deck** (face down), **hand** (hidden), **resource row** (face up), and **discard** (face up).

## The cards

- **Units** have **Power** (damage they deal) and **Health**. They stay on the board, hold zones, and fight.
- **Actions** resolve their effect once, then go to the discard.
- **Upgrades** attach to a unit and change it — most buff one of yours, though a few (like Subjugate) clamp onto an enemy to weaken it. If the wearer dies, the upgrade survives — it stays in that zone, **orphaned**, and either player may later spend a turn to **salvage** it back onto a valid unit in that zone by paying its full cost (resources *and* pips) again. A fallen champion’s sword is anyone’s prize.

Every card has a **cost**, paid with **resources**, and may have colored **pips**, a check on what your bank contains (both below). Cards can carry **keywords** — the shorthand abilities listed at the bottom of this page.

## Setting up

- Each deck is **48+ cards**, at most **4 copies** of any card.
- Draw **7**. Don’t like your hand? **Mulligan** as many times as you like — each redraw gives you one fewer card (down to the 2 you must bank).
- Then **bank 2 cards** from your hand face-up as your starting resources (you pick which — a real choice).
- A coin flip decides who holds the **initiative** first. Then round 1 begins — straight into the action (see below).

## A round, and your turns

The game runs in **rounds**. A round has two parts — a quick automatic **start**, then the **action loop**, where you and your opponent take **turns**. (Round 1 is the exception: it skips the start entirely — more in a moment.)

> **Round vs. turn — the one distinction to hold onto.**
>
> A **round** is one full cycle of the game: both players ready up, draw, and bank, then trade actions until both pass. A **turn** is a *single action* you take during that loop. So a round is made of many turns, and the whole game is a series of rounds.

### 1 · Start of the round

From **round 2 onward**, each player, initiative holder first, does their upkeep automatically:

- **Ready** all your cards (units and resources untap).
- **Draw 2** cards. (Drawing from an empty deck costs you 1 Life and 1 Influence per missing card — slow decks have a clock.)
- You may **bank one card** from hand as a new resource, or skip.

> **Round 1 has no start step at all.**
>
> Setup already gave you everything: your opening hand and your 2 banked resources. So round 1 dives straight into the action loop — no readying (nothing’s exhausted yet), no draw, no banking. Your first “ready, draw 2, bank” comes at the top of round 2. Round 1 is played from the hand you kept, on exactly 2 resources — spend them well.

### 2 · The action loop — taking turns

The **initiative holder takes the first turn**, then you **alternate turns**. On your turn you take exactly**one** action:

- **Play a card** · **Move a unit** · **Attack** · **Use an ability** (a Sneak, or a Ranged volley) · **Release a captive** · **Salvage an orphaned upgrade** · **Claim the initiative** · **Pass**.

There’s no cap on how many turns you take in a round — the limit is your resources and your ready units.**Passing is soft:** if your opponent takes a turn after you passed, you’re back in. **Two passes in a row end the round**, and the next round begins.

> **The initiative.**
>
> Whoever holds the initiative takes the **first turn** of each round. **Claiming the initiative** is itself a turn: you take the token and are **done for the rest of this round** — but you take the **first turn next round**. It’s a tempo trade: bow out early to guarantee the opening move next round. Only one claim per round; otherwise the initiative simply carries over to whoever held it. And note: once someone has claimed, the round ends on a **single** pass — the "two passes in a row" rule needs two players still in it.

## Resources & playing cards

- Each resource pays **1** toward a card’s cost. To play a cost-3 card, **exhaust 3** ready resources — **any** 3; color never matters for payment.
- Resources are **permanent** — the banked card is gone for good, but it pays every round forever. Banking is your economy; most rounds, bank.
- A **unit enters ready** — it can move or attack that same round (each of those still exhausts it as usual). Upgrades attach to a friendly unit — though a rare card clamps onto an enemy instead.

## Colors & pips

Some cards carry colored **pips** beside their cost. Pips are **not** an extra payment — they’re a **presence check** on your bank. Playing a card asks two separate questions:

- **Can you pay?** Exhaust any resources equal to the cost — payment is color-blind, as above.
- **Do you have the colors?** For each color the card has pips in, your bank must **contain** at least that many cards providing that color. Nothing exhausts for this — the cards just have to be there, ready or spent.

A banked card **provides 1 of each color in its own pips**: a card with red and yellow pips provides 1 red *and* 1 yellow — but a card with four red pips still provides just **1 red**. Same-color pips never stack on the providing side, and pip-less cards provide nothing. So a card demanding three red pips wants three *separate* red cards in your bank: what you bank is your color identity.

One sharp edge: a **0-cost card can still have pips**. Free to pay for — but the gate still applies.

## Moving

Moving a unit sends it **one adjacent zone** (Home ↔ Neutral ↔ their Home) and **exhausts** it — so a unit *marches or fights* in a round, not both. Exception: a unit with **Rush** gets *one* free move (no exhaust) each round — so it can reposition and still fight.

## Combat

An attack is **one action**, and you can swing with a whole squad at once. The fight resolves in **pairs** — the defender decides who stands in front of whom:

- **Declare.** Pick **one or more of your ready units in the same zone** — they all exhaust. Choose one target: an enemy unit in their zone, or the enemy **base** (only if your attackers stand in the enemy’s Home).
- **Block — the duel law.** A **single attacker striking a unit cannot be blocked**, with one exception: a ready **Guard** in the zone may step in front of the target — **one Guard, taking the entire hit**. **The base is everyone’s to defend:** a lone attacker striking a **base** faces the open window — any ready unit may block it. Duels are personal; sieges are everyone’s problem. Attack with **two or more** and the defense opens up: the defender may pair any of their **ready units in that zone** onto your attackers — one-on-one, or ganging up — trading your gang's power for their choice of who gets stopped. The declared target may block its own attacker in a gang; blocking exhausts the blocker — except a Guard, who blocks for free.
- **Resolve — every pairing at once.** Each attacker deals its Power to its blocker, and a gang of blockers deals its **combined** Power back to their attacker. In a gang block the attacker’s damage **pours in pair order** — fill the first blocker, spill into the second — so the defender controls the split. Armor shrinks each hit it faces. Attackers **nobody blocked** (including every lone attacker no Guard answered) deal their full Power to the declared target — **and the target strikes back, exhausted or not**. Its Power is a single pool **poured across the unblocked attackers** — biggest threat first, or in the defender’s chosen order — felling as many as it can pay for before it runs dry. A **lone attacker takes the whole blow; a gang splits it** (a 5-Power wall ganged by three 2/2s fells two and wounds the third, not all three). No unit strikes without an answer. (A base never strikes back.) A **kill credits whoever's damage landed it** — blockers included; a walled-off attacker earns nothing from its allies' kills.

If an attacker with **Breakthrough** kills its blocker, the leftover damage pushes through to the original target — and **in the opponent’s Home, through the target too**: excess past a killed unit target pours into their base (blockers → target → Home; a shield still eats the whole hit). Damage **stays** on units between rounds; a unit is destroyed when its damage reaches its Health and goes to the discard — leaving any upgrades it wore **orphaned** in the zone, salvageable by either side.

## Influence

Influence is **one shared track** you fight over — gain some and the marker slides toward your **+20**. It’s **earned by events**, never just by sitting there: a guard is paid when it **defends** — blocking *or* being the one attacked — a champion when it **kills**, and some cards pay out when **played**. Get it to +20 on your side and you win, even while losing the fight for Life. (If one blow crosses *both* finish lines at once, **Life wins**.)

## Keywords

The shorthand you’ll see on cards. Tap any card in the [Cards](https://booherbg.github.io/new-game-demo/#/cards) tab to see its keywords explained in place.

| Keyword | What it does |
|---|---|
| 🪖 Armor N | Every hit this unit takes is reduced by N — and combat resolves in separate pairings, so N comes off each attacker’s blow individually. Two exceptions arrive as one combined hit, shrunk by N once: a gang of blockers striking back at their attacker, and multiple unblocked attackers landing on the same target. |
| 💪 Breakthrough | When this attacker kills its blocker, all the leftover damage pushes through to whatever it was originally attacking — unit or base. And in the OPPONENT’S HOME, nothing is left behind: excess past a killed unit target pours on into their base. No number, no cap: everything spills. |
| ⛔ Can’t attack | A defensive body — it can hold a zone and block, but never attacks. |
| ⛓️ Capture | On its trigger, this unit takes an enemy unit under itself — off the board entirely. Holding costs nothing, and there is no letting go: the captive returns only when the capturer leaves play, coming back to that zone ready. Capture is custody, not a wound — and killing the jailer frees the prisoner. |
| 🏰 Guard | The bodyguard. When a single unit attacks one of yours, ONLY a Guard may step in front of the target — one Guard, taking the whole hit. (Attacks on your base are different: anyone may block those.) And it never exhausts to block, in duels or gangs, so it can do it again and still take its own turn. |
| 🌫️ Hidden | While this unit is ready, enemy actions can’t target it and enemy attacks can’t be declared at it. It can still block — blocking isn’t being targeted — but anything that exhausts it (attacking, blocking, a Sneak) reveals it until it readies again. Strike, vanish, repeat. One limit: Hidden beats choices, not consequences — effects that don’t choose (“all”, whole-zone damage, automatic picks) still reach it. |
| 🗝️ Infiltrate | May be played into any zone — not just your Home. |
| ⚖️ Politician | At the end of each round, count your Politicians: hold the majority in the Neutral zone and you gain 1 Influence per Politician; hold the majority in your enemy’s Home zone and you gain 2 Influence per Politician — the two stack, so holding both is worth 3 per Politician. “Majority” means strictly more of your units than the opponent’s in that zone; a tie is not a majority. The middle finally has a constituency — and the boldest campaigns run in enemy territory: hold the crowd, sway the track. |
| 🏹 Ranged N | An ability used as your turn: exhaust this unit to deal N damage to one enemy unit in any zone — the volley. It’s a chosen shot, so a ready Hidden unit refuses it, and a lethal volley counts as a kill. The unit’s regular attacks are ordinary in every way: same zone, blockable, bases included. Archers carry small blades and big bows. |
| 💨 Rush | A static ability: this unit’s first move each round is free — that one move doesn’t exhaust it, so it can reposition and still fight. One free move per round, and it refreshes every round the unit stays in play; a second move the same round exhausts it like any unit. It grants no extra action and never lets the unit attack any sooner. |
| 🩸 Scar | Gets +1 Power for each damage marked on it — no cap. A 3-Health unit with 2 damage gets +2. Every wound is fuel; the closer to death, the harder it hits. |
| 🛡️ Shielded | Arrives with a shield token. The first time it would take damage, the whole hit is prevented and the token is spent. |
| 🥷 Sneak | An ability you use as your turn: exhaust the unit to resolve its printed Sneak effect on something in its own zone — a unit or the base. Each card’s text says what its Sneak does. |

## Quick reference

> - **Win:** enemy to 0 Life, or Influence to +20 your side.
> - **Round vs turn:** a **round** is one full cycle; a **turn** is one action. A round is made of many turns.
> - **Round 1:** no start step — straight into turns with your opening hand and 2 resources.
> - **Every round after:** both players ready up, draw 2, bank up to 1 — then take turns until two passes in a row.
> - **Your turn:** play a card, move (exhausts), attack, use an ability (Sneak or volley), release a captive, salvage an upgrade, claim initiative, or pass.
> - **Attack:** exhaust your attackers, name one target; the defender pairs blockers onto attackers (blocking exhausts — Guards block free); pairs trade blows at once; unblocked attackers hit the target, and the target strikes back — exhausted or not — its Power poured across the unblocked attackers (a gang splits it; a lone attacker eats it whole).
> - **Costs:** pay with any resources; colored pips just have to be *present* in your bank.
> - **Base:** attack it only from inside the enemy’s Home zone.
> - **Claim initiative:** end your round now to take the first turn next round.

Curious *why* the rules are the way they are — the assumptions, the balance data, the open questions? That’s the [Design Audit](https://booherbg.github.io/new-game-demo/#/audit).

## Engine parameters

Generated from `packages/engine/src/rules.ts` (`V3_RULES`) — the values the demo actually runs.
If a number in the prose above disagrees with this table, the table is right and the prose is a bug.

| Rule | Value | Engine key |
|---|---|---|
| Starting Life | `20` | `startingLife` |
| Influence needed to win (either direction) | `20` | `influenceWinThreshold` |
| Opening hand | `7` | `startingHandSize` |
| Cards banked at setup | `2` | `startingResources` |
| Cards drawn at the start of each round | `2` | `drawPerRound` |
| Cards you may bank per round | `1` | `resourcesPerRound` |
| Minimum deck size | `48` | `deckMinSize` |
| Max copies of one card | `4` | `maxCopies` |
| Life lost per card drawn from an empty deck | `1` | `emptyDrawLifeLoss` |
| Influence lost per card drawn from an empty deck | `1` | `emptyDrawInfluenceLoss` |

Combat model: `blockerPairing` · retaliation: `always` · pips: `presence` · units enter ready: `true` · round-1 start step: `false`
