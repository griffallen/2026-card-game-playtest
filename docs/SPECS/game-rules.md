# Game Rules Spec — v2.3

**Canon:** member of **canon-v1.0** (`docs/canon/CANON.md`); the `-proto` suffix was dropped when the canon sprint (decisions 46–54, 2026-07-09) resolved the open rules flags. Deck-level law lives in the charters (`docs/canon/decks/`); every card must satisfy both this document and its charter.
**Derived from:** `docs/REFERENCES/extracted/rules-v1.2.md` + the July 5 card sheets, reconciled per `docs/DESIGN/DECISIONS.md`. **v2.0:** round-based turn structure with claimable initiative, no summoning sickness, multi-unit attack + intercept (decisions 40–44, 2026-07-08) — supersedes v1.2-proto's phase ladder and per-player turns. **v2.1 (2026-07-09):** Rush's move-exhaust waiver is **one free reposition**, not a whole-round pass (decision 41 clarified) — a fresh Rush unit's first move is free, a second exhausts it. **v2.2 (2026-07-09, canon sprint balance pass):** `prisonDecayPerUnit` 1 → 2 (decision 55). **v2.3 (2026-07-09, same night):** decay reverted to **1** (decision 56) — 55's sims were run against a target-blind bot; after the bot learned to fight prisons (kill jailers, value AoE), re-measurement showed decay 1 gives the better game on every axis (red–yellow 44%, live influence economy at 4–10% upsets).
**Consumed by:** `packages/engine` — this document *is* the engine's contract. When they diverge, stop and fix one.
**Designer-facing summary:** `docs/GAME-FLOW.md` tells the same story without implementation detail.

---

## 1. Core mechanics

### 1.1 Board

Two players. Three in-play zones on a line:

```
[ Player A Home ] — [ Neutral ] — [ Player B Home ]
```

- **Adjacency:** A-Home↔Neutral, Neutral↔B-Home. Home zones are never adjacent to each other.
- Each player also has out-of-play piles: **Deck** (face down, ordered), **Hand** (hidden), **Resource row** (face up; ready/exhausted), **Discard** (face up, public).
- Each player has **Life** (starts at `startingLife`). The pair shares one **Influence** track (starts 0; +15 is Player A's win end from A's perspective — internally stored signed from the perspective of the "host" seat, presented to each player as "yours vs theirs").
- A player's **base** is the player themself, located in their Home zone.

### 1.2 Card anatomy

Every card: `slug`, `name`, `color` (red|yellow), `type` (unit|action|upgrade), `cost` (int ≥0), `text` (display), `effects` (structured — see §3). Units add `power`, `health`. Upgrades attach to a friendly unit.

### 1.3 Game setup (deterministic)

1. Inputs: two players, each with a legal deck (≥ `deckMinSize` cards, ≤ `maxCopies` per slug), a `rulesConfig`, and a 32-bit `seed`.
2. Shuffle both decks with the seeded RNG (Fisher–Yates; player A's deck first, then B's).
3. Initial **initiative holder** = seeded coin flip.
4. Each player draws `startingHandSize` (7). Then the **Setup phase** (initiative holder first): the acting player may **mulligan any number of times — shuffle the hand back, redraw `mulliganPenalty` (1) fewer cards each time** (decision 32; floor = `startingResources`) — then **chooses `startingResources` (2) cards to bank face-up** (`setupBank`, decision 31). When both have banked, round 1 begins. (`chooseStartingResources: false` restores zero-input setup.)
5. Influence 0, Life 20/20, round 1, initiative = coin-flip winner.

### 1.4 Round structure (decision 40 — supersedes per-player turns)

A **round** = one **start step per player** (initiative holder first), then the **action loop** (§1.5), then **end of round**.

**Start step** (per player, in initiative order; the only input is the bank choice):

1. **Prison decay** (−`prisonDecayPerUnit` (1) Influence to this player per unit they hold imprisoned coming into the round — decay-before-triggers, else a start-of-round imprison would instantly self-break at 0 influence).
2. Resolve this player's **start-of-round triggers** (their units, entry order).
3. **Ready** all of this player's cards (units + resources).
4. **Draw** `drawPerRound` (2); round 1 draws `firstRoundDraw` (default = `drawPerRound` — decision 44: no first-round asymmetry). **Decision 33:** each card that fails to appear from an empty deck costs its owner `emptyDrawLifeLoss` (1) life and `emptyDrawInfluenceLoss` (1) influence.
5. **Bank:** may resource up to `resourcesPerRound` (1) card from hand, face up, or skip.

**End of round** (after the action loop closes): resolve end-of-round triggers (initiative holder's units first, entry order within a player), then **Overextend self-damage** lands (decision 35; armor doesn't reduce it), then "this round" modifiers expire. Win checks run after every atomic change as always (§1.12). The next round begins; **initiative carries over unless it was claimed** (§1.5).

### 1.5 Action loop — taking turns, passing, claiming initiative

- The **initiative holder takes the first turn**; players then **alternate turns**, one single action each. **A turn = one action** (play / attack / move / activate / claim / pass); a round is a series of turns. There is no "active player" — both players have the full action menu on their own turns.
- **Actions:** play a card (§1.6), attack (§1.7), move a unit (§1.8), activate an ability (§1.9), **claim initiative**, pass. Concede is legal at any time. Unlimited actions per round — the constraint is resources and ready units, not a count.
- **Claim initiative:** take the initiative token **and leave the action loop for the rest of the round**. Either player may claim — including the current holder, to lock it in. At most one claim per round (the token, once claimed, is held). After a claim, the remaining player takes actions solo until they pass (or claim-and-lock is moot — they just pass).
- **Pass is soft:** if your opponent acts after your pass, you may act again. **Two consecutive passes end the loop.** After a claim, the remaining player's single pass ends it.
- If a player has no legal action, their only action is pass.
- **State:** `initiative: Seat` plus a per-seat `outOfRound` flag (set by claiming, cleared each round) are part of game state and the replay contract.

### 1.6 Playing a card

1. Pay cost: exhaust exactly `cost` ready resources (all resources are worth 1 — colored costs are not yet in the rules).
2. **Unit** → enters the owner's Home zone, **ready and unrestricted** (decision 41 — no summoning sickness): later actions this same round may move or attack with it as normal. **Rush** = its *first* move doesn't exhaust it the round it enters — one free reposition, not a whole-round waiver (§3.1). On-play (`onEnter`) triggers fire with targets already declared in the submitted action.
3. **Action** → resolve effects, then discard.
4. **Upgrade** → attach to a target friendly unit in any zone. **Upgrade pressure (v1.2):** if the unit already has ≥1 upgrade, the opponent gains `upgradePressureInfluence` (1) Influence.
5. Targets are validated at submission; if any target became illegal, the action is rejected (client re-prompts).

### 1.7 Attacking (decision 42 — one action = N attackers, one target, one intercept window)

1. **Declare:** choose one or more friendly ready, non-imprisoned units **in one zone** (up to `maxAttackers`, 0 = unlimited); **exhaust them all**. Choose one target, legal for the whole group:
   - an enemy unit in the **same zone**, or
   - an enemy unit in an **adjacent zone** only if **every attacker has Ranged or Reach** (Ranged never targets bases and takes no counter cross-zone; Reach *may* assault bases and *does* take counter — §3.1), or
   - the **enemy base**, only if the group stands in that enemy's Home zone.
   - **Overextend is declared per attacking unit** (decision 35: +N power now, N self-damage at end of round).
2. **Intercept window (the defender prompt):** the defender may redirect the *whole* attack to one **ready, non-imprisoned** unit they control **in the target's zone**, other than the declared target. Intercepting **exhausts** the interceptor (`interceptExhausts`) — unless it has **Guard**, which intercepts without exhausting. Declining leaves the declared target. If no legal interceptor exists, the window auto-passes (consistent with all named response windows). Guard **no longer forces targeting** — protection is the defender's choice, made here.
3. **Resolve simultaneously:**
   - The attackers' **combined power** (+Overextend bonuses) is **one hit**; the final target's Armor reduces it **once** (`armorPerAttack: once` — massing attackers is the designed answer to armor).
   - The final target, if a non-imprisoned **unit**, deals its full `power` back to the **highest-power attacker** (ties → earliest entry order; `counterAssignment: auto`), reduced by that attacker's Armor. A **base** deals nothing back.
   - **Breakthrough N:** if the final target is a unit and is destroyed, excess damage beyond lethal — capped at the **sum** of the attackers' Breakthrough values — hits its controller's Life.
4. **Triggers:** `onAttack` fires per attacking unit at declaration. `onDefend` fires when a unit **is the final target or intercepts** (Yellow's guards get paid for stepping in — decision 34's intent). `onAttackBase` fires at resolution only if the *final* target is the base (an intercepted base-attack never "hit the base"). `onKill` fires for **every** attacking unit if the final target dies (all participants get credit). (⚑ Implementation: `onDefend` resolves *before* damage lands and references the first attacker — fine for the shipped influence-only onDefend cards; revisit the timing/target if a strike-back onDefend is ever printed.)
5. Destroyed units (damage ≥ health) go to their owner's discard with their upgrades. Damage persists between rounds otherwise.

**Engine shape:** the game's first mid-action prompt — paired actions `attackDeclared` → `interceptResponse` in the event log, exactly like the existing named response windows.

### 1.8 Moving

Move one friendly ready unit to an **adjacent zone**; the unit **exhausts** (`moveExhausts`). **Rush:** the round a unit entered play, its **first** move does **not** exhaust it — a single free reposition, so it can move and still attack; a **second** move exhausts it like any unit (decision 41; `rushCoversAttack` extends the waiver to its attack, default off). **Flying** may move to *any* zone. Imprisoned units cannot move.

### 1.9 Activated abilities

Printed as "Exhaust: effect" — exhaust the ready unit, resolve the effect. **⚑ Deferred — not implemented:** no card in the current pool uses an activated ability, so the `activate` action and the ability field are unbuilt. Add when a card needs one.

### 1.10 Influence

- One shared track, stored as a signed integer from the host seat's perspective; each player's UI shows "you vs them."
- "Gain N Influence" moves the track N toward your +15. "Opponent loses N" ≡ you gain N.
- **Win:** track at ±`influenceWinThreshold` (15) after any atomic change → that side wins (subject to §1.12 ordering). Static effects can modify a player's threshold (Radiant Citadel).
- Track clamps at the winning value (no overshoot bookkeeping).

### 1.11 Prison

- **Imprison:** target unit becomes imprisoned (stays in its zone, keeps upgrades/damage). It cannot attack, move, defend (deals no counter-damage), or use abilities; its Guard is inert; it still counts as a unit for zone effects.
- **Sources:** unit-sourced prisons (from a unit's trigger) end when that unit leaves play. Action-sourced prisons have no in-play source and persist until another condition ends them.
- **Decay:** at the jailer's **start step**, jailer loses `prisonDecayPerUnit` (1) Influence per unit they hold imprisoned. Cards restating this are reminder text — no double charge.
- **Release threshold (default 0; the whole prison package is provisional pending decision 37):** the moment a jailer's Influence is negative (track on their opponent's side), **all their prisons release**.
- Released or source-dead prisons end immediately; the unit stays exhausted/ready as it was.

### 1.12 Winning, losing, simultaneity

Checked after every atomic state change, in order:

1. **Life:** any player at ≤0 Life loses. If **both** are ≤0 from the same change, the player who submitted the causing action **wins**.
2. **Influence:** track at a winning threshold → that side wins.
3. Concede: immediate loss.

First check that fires ends the game; later checks don't run.

### 1.13 Determinism

Same `(rulesConfig, decks, seed, action list)` ⇒ identical states and events, always. All randomness (shuffles, coin flip) flows through the seeded RNG. No wall-clock, no I/O, no hidden nondeterminism. Trigger resolution order is defined (initiative holder's units first, then by unit entry order; a player's own start step resolves only their own triggers). This contract enables replay, undo, reconnection, and simulation.

---

## 2. Parameters (`RulesConfig` — admin-editable, versioned)

| Key | Default | Meaning |
|---|---|---|
| `startingLife` | 20 | Life each player starts with; also the healing cap |
| `influenceWinThreshold` | 15 | Track value that wins (per side; static effects may raise a side's) |
| `startingHandSize` | 7 | Cards drawn at setup |
| `startingResources` | 2 | Auto-resourced at setup |
| `drawPerRound` | 2 | Cards drawn in each start step |
| `firstRoundDraw` | 2 | Round-1 draw count (= `drawPerRound`, decision 44; lower it to nerf initiative) |
| `resourcesPerRound` | 1 | Max cards banked per start step |
| `deckMinSize` | 48 | Deck legality floor |
| `maxCopies` | 4 | Per-slug copy ceiling |
| `upgradePressureInfluence` | 1 | Influence the opponent gains per beyond-first upgrade |
| `prisonDecayPerUnit` | 1 | Influence lost per imprisoned unit at the jailer's start step (briefly 2 in v2.2; reverted in v2.3, decisions 55–56) |
| `prisonReleaseThreshold` | 0 | Jailer influence below this ⇒ prisons release |
| `chooseStartingResources` | true | Setup: players pick their starting banks (false = auto-bank last drawn) |
| `mulliganPenalty` | 1 | Cards lost per mulligan (decision 32) |
| `emptyDrawLifeLoss` | 1 | Life lost per failed draw (decision 33) |
| `emptyDrawInfluenceLoss` | 1 | Influence lost per failed draw (decision 33) |
| `summoningSickness` | **false** | Legacy A/B lever (decision 41: units enter ready); true restores can't-act-on-entry |
| `moveExhausts` | true | Moving exhausts the unit |
| `rushCoversAttack` | false | Rush's exhaust waiver also covers the entry-round attack (decision 41 toggle) |
| `interceptExhausts` | true | Intercepting exhausts the interceptor (Guard always exempt) |
| `counterAssignment` | `"auto"` | Counter-damage target in multi-unit attacks: `auto` (highest power) \| `defender` (future) |
| `armorPerAttack` | `"once"` | Armor vs a multi-unit hit: `once` on the total \| `perAttacker` (future) |
| `maxAttackers` | 0 | Cap on units per attack action (0 = unlimited) |
| `simultaneousLifeTiebreak` | `"actor"` | Who wins a both-dead tie: `actor` \| `active` \| `draw` |

---

## 3. Effect vocabulary

Cards carry structured effects — never free text — so the engine can validate every card (GENESYS: a new card must not silently break games).

### 3.1 Keywords (static, on units)

`guard` (intercepts without exhausting — §1.7; forced targeting is gone), `armor N`, `rush` (the round it enters play, its *first* move doesn't exhaust it — one free reposition, not a whole-round pass — decision 41; `rushCoversAttack` extends to attacks; meaningful on veterans when granted mid-round), `ranged` (may shoot an adjacent zone; never bases; no counter-damage cross-zone), `reach` (may attack an adjacent zone like Ranged, but unlike Ranged it *can* still assault bases and *does* take counter-damage — Blaze Juggernaut), `flying` (may move to *any* zone, ignoring adjacency — decision 48), `breakthrough N`, `overextend N` (optional attack gamble: +N power now, N self-damage at end of round — decision 35), `cantAttack`, `untargetable` (can't be targeted by enemy actions — Chain of Law).

### 3.2 Effect ops (one-shot, run in order)

| Op | Params | Notes |
|---|---|---|
| `damage` | target, amount | unit or base; Armor reduces **all** damage to a unit, combat or effect (v1.2: "reduces incoming damage by X") |
| `damageAll` | scope (zone/all/enemy), amount | e.g. Scorching Howl |
| `heal` | target, amount | unit damage or base life (capped) |
| `draw` | count | |
| `influence` | amount (±, from controller's view) | event-attached (decision 34): onDefend / onKill / onPlay / startOfRound / endOfRound. The engine allows any attachment; the **deck charters** govern which a color may print (yellow: event-earned only — per-round income is charter-illegal, which is why Aura of Resolve was redesigned in session 006) |
| `imprison` | target(s) or filter (e.g. power ≤ N, all-in-zone) | source recorded |
| `release` | target | ⚑ reserved — no current card; standalone release not implemented (auto-release on source-death / negative influence is built into cleanup) |
| `buff` | target, power/health delta, duration (`round`/`permanent`) | "this round" expires at end of round |
| `grantKeyword` | target, keyword, duration | e.g. "target unit gains Rush" |
| `destroy` | target, constraint (e.g. damaged, upgrade) | |
| `double` | target | doubles the target's Power for the round (Unchained Rage) |
| `readyUnits` | scope or single target | "second wind" cards; with a single chosen target = ready one unit (Final Onslaught) |
| `extraAction` | — | after this action resolves, the same player immediately takes another action (opponent's turn skipped once). Final Onslaught = `readyUnits(one target)` + `extraAction` (decision 43; replaces `extraTurn`) |
| `moveUnit` | target, zone | ⚑ reserved — no current card; not implemented as an op (movement is a player action, §1.8) |
| `preventBaseDamage` | amount, duration round | Devout Intervention |
| `removeNegative` | target | clears imprisonment + negative modifiers (Absolution) |
| `thresholdMod` | side, delta, while-in-play | Radiant Citadel (decision 49) |

**Spec ↔ code names:** the engine implements a few ops/triggers under different identifiers — `damageAll`=`damageFilter`, `grantKeyword`=`grant`, `readyUnits`=`ready`, `preventBaseDamage`=`preventBase`, `thresholdMod`=`oppThreshold` (a static), `onEnter`=`onEnterZone`/`onPlay`. All are guarded by `validateCardSet`.

### 3.3 Triggers (on units/upgrades)

`onEnter` (play or zone entry), `onAttack`, `onDefend` (final target of an attack **or** intercepts — §1.7), `onAttackBase` (final target is the base), `onKill`, `startOfRound` (controller's start step), `endOfRound`, `onAnyImprisoned` (Gateward Colossus), `onDestroyed`.

Each trigger holds effect ops. Targets a trigger needs are declared in the submitted action (`onEnter` imprisons, etc.); start-of-round triggers that need targets use the deterministic default of decision 51 — **the strongest eligible enemy unit, ties → earliest entry — and the card text must state the rule** rather than imply a choice.

### 3.4 Statics (continuous while in play)

`aura` — grants keyword or ±power to a filtered set (friendly-in-zone, all-friendly, other-friendly), with optional condition (`influence ≥ 10` — Hierophant); `thresholdMod`; `imprisonWatcher`.

### 3.5 Escape hatch

A card may reference a named custom routine implemented in the engine (`custom: "vanguard-commander"`). Ships empty tonight; exists so one weird future card doesn't force a DSL redesign.

---

## 4. Deck legality

≥ `deckMinSize` total, ≤ `maxCopies` per slug, single color not enforced (⚑ color identity rules don't exist yet).

## 5. Undo (playtest affordance, ⚑)

Either player may rewind the last action (event-sourced replay of `actions[0..n-1]`). Logged in the game log as "X undid Y". Hidden-information leaks (an undone draw) are accepted — this is a trust-based tool for two collaborators.

## 6. Conformance audit (2026-07-08)

An adversarial spec↔engine audit verified §1.5–1.12 conform exactly — all seven surfaced judgment calls are present and tested (breakthrough-sum, all-attackers-onKill, interceptor-in-target-zone, claim-to-lock, overextend-before-expiry, `summoningSickness` legacy param, all-Ranged/Reach adjacent gate). Reconciled from that pass:

- **Fixed in code:** `endOfRound` triggers now fire (§1.4 — they were silently ignored, a GENESYS-style hole); rules configs with unimplemented values (`counterAssignment`≠`auto`, `armorPerAttack`≠`once`) now **fail loudly** at game creation instead of being silently ignored.
- **Clarified above:** `reach` (§1.7/§3.1), the `double` op, deferred §1.9 activated abilities, reserved `release`/`moveUnit` ops, `onDefend` timing.
- **Open / low-severity:** `simultaneousLifeTiebreak` — only `actor` (the spec default = acting player, §1.12) is meaningfully implemented; `active` maps to the initiative holder; `draw` has no game-state outcome yet and falls back to `actor`. Setup draws hands *before* the coin flip (§1.3 lists the flip first) — harmless, determinism preserved (draws consume no RNG).
