<!-- GENERATED FILE — do not edit.
     Source: apps/demo/src/pages/Rules.tsx (the rulebook players read on the demo).
     Regenerate: npm run rules:doc -->

# How to Play

*Rules version **4.0.0** — the same number as the engine package, bumped on every combat-behaviour change (issue #119).*

Everything you need to sit down and play, the game as it stands today. Want to try it while you read? The [Play](https://booherbg.github.io/new-game-demo/#/play) tab runs the full rules in your browser, and every card’s exact text is in the [Cards](https://booherbg.github.io/new-game-demo/#/cards) tab.

## Winning the game

You win the instant either of these happens (checked after every single change):

- **Life:** your opponent’s Life hits **0**.
- **🕊️ Hope:** your own Hope reaches **+12**, or your opponent’s reaches **−12**. Each player has a separate Hope track.

**If outcomes happen together:** if a single event would drop both players to 0 Life at once, the player who took the action wins. If both players would win at once, the player whose action triggered the result wins.

## The setup

### 1 · The board and your cards

Three zones sit in a line. Units march one step at a time between them:

> ```
> [ Your Home ] — [ Neutral ] — [ Their Home ]
> ```

- **Adjacent** zones are the ones touching on the line. The two Home zones are **not** adjacent to each other — you have to cross Neutral.
- Your **base** is you. It starts at **24 Life**, lives in your Home zone, and takes Life damage. An enemy can only attack it from **inside your Home zone**.
- Off to the side you keep your **deck** (face down), **hand** (hidden), **resource row** (face up), and **discard** (face up).

- **Units** have **Power** (damage they deal) and **Health**. They stay on the board, hold zones, and fight.
- **Actions** resolve their effect once, then go to the discard.
- **Upgrades** attach to a unit and change it — most buff one of yours, though a few (like Subjugate) clamp onto an enemy to weaken it. If the wearer dies, the upgrade survives — it stays in that zone, **orphaned**, and either player may later spend a turn to **salvage** it back onto a valid unit in that zone by paying its full cost (resources *and* pips) again. A fallen champion’s sword is anyone’s prize.

Every card has a **cost**, paid with **resources**, and may have colored **pips**, a check on what your bank contains (both below). Cards can carry **keywords** — the shorthand abilities listed at the bottom of this page.

### 2 · Start the game

- Each deck is **48+ cards**, at most **4 copies** of any card.
- Draw **7**. Don’t like your hand? **Mulligan** as many times as you like — each redraw gives you one fewer card (down to the 2 you must bank).
- Then **bank 2 cards** from your hand face-up as your starting resources (you pick which — a real choice).
- A coin flip gives one player the **🥇 Regroup marker**. That player takes the first turn of round 1. Then the action begins (see below).

### 3 · Resources and playing cards

A card is **ready** when it can act. To **exhaust** a card, turn it sideways; it normally cannot act again until the next round.

- Each resource pays **1** toward a card’s cost. To play a cost-3 card, **exhaust 3** ready resources — **any** 3; color never matters for payment.
- Resources are **permanent** — the banked card is gone for good, but it pays every round forever. Banking is your economy; most rounds, bank.
- A **unit enters ready** — it can move or attack that same round (each of those still exhausts it as usual). Upgrades attach to a friendly unit — though a rare card clamps onto an enemy instead.

### Colors and pips

Some cards carry colored **pips** beside their cost. Pips are **not** an extra payment — they’re a **presence check** on your bank. Playing a card asks two separate questions:

- **Can you pay?** Exhaust any resources equal to the cost — payment is color-blind, as above.
- **Do you have the colors?** For each color the card has pips in, your bank must **contain** at least that many cards providing that color. Nothing exhausts for this — the cards just have to be there, ready or spent.

A banked card **provides 1 of each color in its own pips**: a card with red and yellow pips provides 1 red *and* 1 yellow — but a card with four red pips still provides just **1 red**. Same-color pips never stack on the providing side, and pip-less cards provide nothing. So a card demanding three red pips wants three *separate* red cards in your bank: what you bank is your color identity.

One sharp edge: a **0-cost card can still have pips**. Free to pay for — but the gate still applies.

> **Example: cost and pips are separate.**
>
> Suppose your bank holds three cards: one with a red pip, one with a red-and-yellow pip, and one with no pips. You can spend **any three** of them to play a cost-3 card. A card needing **two red pips** is legal too, because two separate banked cards provide red. A card needing **three red pips** is not legal yet — even if one of your red cards prints several red pips, it provides only one red source.

## A round, and your turns

The game runs in **rounds**. A round has two parts — a quick automatic **start**, then the **action loop**, where you and your opponent take **turns**. (Round 1 is the exception: it skips the start entirely — more in a moment.)

> **Round vs. turn — the one distinction to hold onto.**
>
> A **round** is one full cycle of the game: both players ready up, draw, and bank, then trade actions until both pass. A **turn** is a *single action* you take during that loop. So a round is made of many turns, and the whole game is a series of rounds.

### 1 · Start of the round

From **round 2 onward**, upkeep runs **one player at a time** — the player holding the **🥇 Regroup marker first**, all the way through, then the opponent. Readying and drawing happen on their own; **banking is a decision**:

- **Ready** all your cards (units and resources untap).
- **Draw 2** cards. (Drawing from an empty deck costs you 1 Life and 1 of *your* Hope per missing card — slow decks have a clock.)
- You may **bank one card** from hand as a new resource, or skip.

Order matters here. The holder banks **first — and blind**, before the opponent has drawn or banked a thing. The opponent banks **second, having already seen** what the holder laid down, and can answer it. First to the Regroup marker, first to commit.

> **The exact order, step by step.**
>
> **Regroup-marker holder, in full:** ready → draw 2 → bank one or skip. This bank is **blind** — the opponent hasn’t drawn or banked yet.
>
> **Then the opponent, in full:** ready → draw 2 → bank one or skip — now **seeing** the resource the holder just banked, and free to answer it.

> **Round 1 has no start step at all.**
>
> Setup already gave you everything: your opening hand and your 2 banked resources. So round 1 dives straight into the action loop — no readying (nothing’s exhausted yet), no draw, no banking. Your first “ready, draw 2, bank” comes at the top of round 2. Round 1 is played from the hand you kept, on exactly 2 resources — spend them well.

### 2 · The action loop — taking turns

The player holding the **🥇 Regroup marker takes the first turn**, then you **alternate turns**. On your turn you take exactly**one** action:

- **Play a card** · **Move a unit** · **Attack** · **Use an ability** (a Sneak, or a Ranged volley) · **Salvage an orphaned upgrade** · **Regroup** · **Pass**.

There’s no cap on how many turns you take in a round — the limit is your resources and your ready units.**Passing is soft:** if your opponent takes a turn after you passed, you’re back in. **Two passes in a row end the round**, and the next round begins.

> **Regroup.**
>
> Whoever holds the **🥇 Regroup marker** takes the **first turn** of each round. **Regrouping** is itself a turn: you take the marker and are **done for the rest of this round**. Your opponent then keeps taking turns —**one after another, alone** — until they pass, and that **single** pass ends the round (the "two passes in a row" rule needs two players still in it). Your reward: the token **stays with you** and hands you the **first turn next round**. It’s a tempo trade — bow out early to guarantee the opening move next round. Only **one player can Regroup each round**; if nobody regroups, the marker stays with its current holder.

## Moving

Moving a unit sends it **one adjacent zone** (Home ↔ Neutral ↔ their Home) and **exhausts** it — so a unit *marches or fights* in a round, not both. Exception: a unit with **Rush** gets *one* free move (no exhaust) each round — so it can reposition and still fight.

## Combat

An attack is **one action**, and you can swing with a whole squad at once. The fight resolves in **pairs** — the defender decides who stands in front of whom:

> **Combat in three steps.**
>
> **Declare:** choose your ready attackers and name one target.
>
> **Block:** the defender assigns any legal ready blockers.
>
> **Resolve:** every pairing deals damage at once; anyone left unblocked hits the declared target.

- **Declare.** Pick **one or more of your ready units in the same zone** — they all exhaust. Choose one target: an enemy unit in their zone, or the enemy **base** (only if your attackers stand in the enemy’s Home).
- **Block — the duel law.** A **single attacker striking a unit cannot be blocked**, with one exception: a **ready Guard** in the zone may step in front of the target — **one Guard, taking the entire hit** (two Guards can’t gang a lone attacker, and an exhausted Guard can’t block at all). **The base is everyone’s to defend:** a lone attacker striking a **base** faces the open window — any ready unit may block it. Duels are personal; sieges are everyone’s problem. Attack with **two or more** and the defense opens up: the defender may pair any of their **ready units in that zone** onto your attackers — one-on-one, or ganging up, though **each blocker answers only one attacker** — trading your gang's power for their choice of who gets stopped. The declared target may block its own attacker in a gang. Blocking **exhausts** the blocker — except a **Guard, who blocks for free and stays ready**, able to take its own turn after.
- **Resolve — every pairing at once.** Each attacker deals its Power to its blocker, and a gang of blockers deals its **combined** Power back to their attacker. In a gang block the attacker’s damage **pours in pair order** — fill the first blocker, spill into the second — so the defender controls the split. Armor shrinks each hit it faces. Attackers **nobody blocked** (including every lone attacker no Guard answered) deal their full Power to the declared target — **and the target strikes back, exhausted or not**. Its Power is a single pool **poured across the unblocked attackers** — biggest threat first, or in the defender’s chosen order — felling as many as it can pay for before it runs dry. A **lone attacker takes the whole blow; a gang splits it** (a 5-Power wall ganged by three 2/2s fells two and wounds the third, not all three). No unit strikes without an answer. (A base never strikes back.) A **kill credits whoever's damage landed it** — blockers included; a walled-off attacker earns nothing from its allies' kills.

**Breakthrough** won’t let damage stop at a corpse. When such an attacker **defeats** what it strikes, the leftover **splashes onward** — and the **defender chooses where it lands**: another of their units in that zone, or (when the fight stands in their own **Home**) their **base**. Defeat that link too and the rest **chains** to the defender’s next pick, on and on, until a unit **survives and soaks it** or nothing is left to strike. Only Breakthrough chains — plain damage stops at the declared target. A **Shield** or**Ward** turns the whole blow aside and **ends the chain**. Damage **stays** on units between rounds; a unit is destroyed when its damage reaches its Health and goes to the discard — leaving any upgrades it wore**orphaned** in the zone, salvageable by either side.

> **Example: a duel**
>
> A 3-Power attacker challenges a 2-Power unit. With no ready Guard, nobody else may block the duel. The attacker deals 3 damage to the target, and the target deals 2 damage back.

> **Example: a gang**
>
> Two attackers swing at one enemy unit. The defender may assign ready units to either attacker, one at a time; each blocker can answer only one attacker. This is the moment a defender can choose who gets stopped.

> **Example: a base attack**
>
> A lone unit attacks the base from the enemy Home. Any ready defender may block it. If nobody blocks, the attacker deals its full Power to the base’s Life.

## 🕊️ Hope

Each player has a **separate Hope track**, from **−12 to +12**. Your card effects change **your** Hope by default. Reach **+12** to win; fall to **−12** and you lose. Hope is **earned by events**, never just by sitting there: a guard is paid when it **defends** — blocking *or* being the one attacked — a champion when it **kills**, and some cards pay out when **played**.

## Keywords

The shorthand you’ll see on cards. Tap any card in the [Cards](https://booherbg.github.io/new-game-demo/#/cards) tab to see its keywords explained in place.

| Keyword | What it does |
|---|---|
| 🪖 Armor N | Every hit this unit takes is reduced by N — and combat resolves in separate pairings, so N comes off each attacker’s blow individually. Two exceptions arrive as one combined hit, shrunk by N once: a gang of blockers striking back at their attacker, and multiple unblocked attackers landing on the same target. |
| 💪 Breakthrough | When this attacker DEFEATS what it strikes, the leftover damage splashes onward — and the DEFENDER chooses where it lands: another of their units in that zone, or their base when the fight is in their own Home. Defeat that one too and the rest chains to their next pick, link after link, until a unit survives and soaks it or nothing is left to hit. Plain (non-Breakthrough) damage never chains. A Shield or Ward turns the whole blow aside and ends the chain. No number, no cap: everything spills. |
| ⛔ Can’t attack | A defensive body — it can hold a zone and block, but never attacks. |
| 🔒 Capture | On its trigger, this unit takes an enemy unit under itself — off the board entirely. Holding costs nothing, and there is no letting go: the captive returns only when the capturer leaves play, coming back to that zone ready. Capture is custody, not a wound — and killing the jailer frees the prisoner. |
| 🏰 Guard | The bodyguard. When a single unit attacks one of yours, only a READY Guard may step in front of the target — one Guard, taking the whole hit. Two Guards can’t gang a lone attacker, and an exhausted Guard can’t block at all. (Attacks on your base are different: anyone may block those.) A Guard never exhausts to block, in duels or gangs — it stays ready, so it can block now and still take its own turn. |
| 🙈 Hidden | While this unit is ready, enemy actions can’t target it and enemy attacks can’t be declared at it. It can still block — blocking isn’t being targeted — but anything that exhausts it (attacking, blocking, a Sneak) reveals it until it readies again. Strike, vanish, repeat. One limit: Hidden beats choices, not consequences — effects that don’t choose (“all”, whole-zone damage, automatic picks) still reach it. |
| 🗝️ Infiltrate | May be played into any zone — not just your Home. |
| ⚖️ Tribune | A Tribune changes its controller’s Hope just by taking the field or leaving it: +1 Hope every time it enters play — whether it is deployed from hand or returns from capture — and −1 every time it leaves play, whether it is defeated or captured. It keys off the event, not the reason, so over a Tribune’s whole life the change nets to zero and cannot be farmed (a capture’s −1 and its release’s +1 cancel). Separately, at the end of each round, count your Tribunes: hold the majority in the Neutral zone and you gain 1 Hope per Tribune; hold the majority in your enemy’s Home zone and you gain 2 Hope per Tribune — the two stack, so holding both is worth 3 per Tribune. “Majority” means strictly more of your units than the opponent’s in that zone; a tie is not a majority. |
| 🏹 Ranged N | An ability used as your turn: exhaust this unit to deal N damage to one enemy unit in any zone — the volley. It’s a chosen shot, so a ready Hidden unit refuses it, and a lethal volley counts as a kill. The unit’s regular attacks are ordinary in every way: same zone, blockable, bases included. Archers carry small blades and big bows. |
| 💨 Rush | A static ability: this unit’s first move each round is free — that one move doesn’t exhaust it, so it can reposition and still fight. One free move per round, and it refreshes every round the unit stays in play; a second move the same round exhausts it like any unit. It grants no extra action and never lets the unit attack any sooner. |
| 🩸 Scar | Gets +1 Power for each damage marked on it — no cap. A 3-Health unit with 2 damage gets +2. Every wound is fuel; the closer to death, the harder it hits. |
| 🛡️ Shielded | Arrives with a shield token. The first time it would take damage, the whole hit is prevented and the token is spent. |
| 🥷 Sneak | An ability you use as your turn: exhaust the unit to resolve its printed Sneak effect on something in its own zone — a unit or the base. Each card’s text says what its Sneak does. |

## Quick reference

> - **Win:** enemy to 0 Life, your Hope to +12, or their Hope to −12.
> - **Round vs turn:** a **round** is one full cycle; a **turn** is one action. A round is made of many turns.
> - **Round 1:** no start step — straight into turns with your opening hand and 2 resources.
> - **Every round after:** both players ready up, draw 2, bank up to 1 — then take turns until two passes in a row.
> - **Your turn:** play a card, move (exhausts), attack, use an ability (Sneak or volley), salvage an upgrade, Regroup, or pass.
> - **Attack:** exhaust your attackers, name one target; the defender pairs blockers onto attackers (blocking exhausts — Guards block free); pairs trade blows at once; unblocked attackers hit the target, and the target strikes back — exhausted or not — its Power poured across the unblocked attackers (a gang splits it; a lone attacker eats it whole).
> - **Costs:** pay with any resources; colored pips just have to be *present* in your bank.
> - **Base:** attack it only from inside the enemy’s Home zone.
> - **Regroup:** end your round now and take the 🥇 marker, so you take the first turn next round.

Curious *why* the rules are the way they are — the assumptions, the balance data, the open questions? That’s the [Design Audit](https://booherbg.github.io/new-game-demo/#/audit).

## Engine parameters

Generated from `packages/engine/src/rules.ts` (`V3_RULES`) — the values the demo actually runs.
If a number in the prose above disagrees with this table, the table is right and the prose is a bug.

| Rule | Value | Engine key |
|---|---|---|
| Starting Life | `24` | `startingLife` |
| Influence needed to win (either direction) | `undefined` | `influenceWinThreshold` |
| Opening hand | `7` | `startingHandSize` |
| Cards banked at setup | `2` | `startingResources` |
| Cards drawn at the start of each round | `2` | `drawPerRound` |
| Cards you may bank per round | `1` | `resourcesPerRound` |
| Minimum deck size | `48` | `deckMinSize` |
| Max copies of one card | `4` | `maxCopies` |
| Life lost per card drawn from an empty deck | `1` | `emptyDrawLifeLoss` |
| Influence lost per card drawn from an empty deck | `1` | `emptyDrawInfluenceLoss` |

Combat model: `blockerPairing` · retaliation: `always` · pips: `presence` · units enter ready: `true` · round-1 start step: `false`
