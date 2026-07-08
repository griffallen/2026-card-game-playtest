# Game Rules Spec — v1.2-proto

**Derived from:** `docs/REFERENCES/extracted/rules-v1.2.md` (authoritative) + the July 5 card sheets, reconciled per `docs/DESIGN/DECISIONS.md` (all ⚑ decisions).
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
3. First player = seeded coin flip.
4. Each player draws `startingHandSize` (7). Then — **decision 31 (2026-07-08)** — the game opens in a **Setup phase**: each player, first player first, **chooses `startingResources` (2) cards from hand to bank face-up** (action `setupBank`). When both have banked, turn 1 begins. (`chooseStartingResources: false` restores the old zero-input mode: the last cards drawn are banked automatically.)
5. Influence 0, Life 20/20, turn 1, active = first player, phase = Reset.

### 1.4 Turn structure

Phases run in order; only Resource and Main take input.

| Phase | What happens |
|---|---|
| **Reset** | Apply **prison decay** first (−1 Influence to the jailer per unit they held imprisoned coming into the turn — decay-before-triggers, else a start-of-turn imprison would instantly self-break at 0 influence), then resolve start-of-turn triggers (active player's units in entry order), then ready all of the active player's cards (units + resources). |
| **Draw** | Active player draws `drawPerTurn` (2). Game turn 1 draws `firstTurnDraw` (1) instead. Drawing from an empty deck draws nothing. |
| **Resource** | Active player may resource up to `resourcesPerTurn` (1) card from hand, face up, or skip. |
| **Main** | Action alternation — see §1.5. |
| **End** | Resolve end-of-turn triggers (same ordering rule), expire "this turn" modifiers, then pass the turn. |

### 1.5 Main phase — action alternation

- The **active player acts first**; players then alternate single actions.
- Passing is an action. **Two consecutive passes end the phase.**
- If a player has no legal action, their only action is pass.

| Action | Active player | Non-active player |
|---|---|---|
| Play a card (§1.6) | ✓ | ✓ |
| Attack (§1.7) | ✓ | — |
| Move a unit (§1.8) | ✓ | — |
| Activate an ability (§1.9) | ✓ | ✓ |
| Pass | ✓ | ✓ |
| Concede | any time | any time |

### 1.6 Playing a card

1. Pay cost: exhaust exactly `cost` ready resources (all resources are worth 1 — colored costs are not yet in the rules).
2. **Unit** → enters the owner's Home zone, ready, but cannot attack or move this turn (**summoning sickness**) unless it has **Rush**. On-play (`onEnter`) triggers fire with targets already declared in the submitted action.
3. **Action** → resolve effects, then discard.
4. **Upgrade** → attach to a target friendly unit in any zone. **Upgrade pressure (v1.2):** if the unit already has ≥1 upgrade, the opponent gains `upgradePressureInfluence` (1) Influence.
5. Targets are validated at submission; if any target became illegal, the action is rejected (client re-prompts).

### 1.7 Attacking (one action = one attacker, one target)

1. Choose a friendly ready unit that isn't summoning-sick or imprisoned; **exhaust it**.
2. Choose a target:
   - an enemy unit in the **same zone**, or
   - an enemy unit in an **adjacent zone** if the attacker has **Ranged** (Ranged never targets bases), or
   - the **enemy base**, only if the attacker stands in that enemy's Home zone.
   - **Guard:** if the defender owns a non-imprisoned Guard unit in the contested zone, the target must be such a Guard unit (base included in the protection).
3. Resolve simultaneously:
   - Attacker deals `power` (+Overextend bonus if it's the only friendly unit in its zone) to the target, reduced by target's Armor.
   - A defending **unit** deals its `power` back (reduced by attacker's Armor) — unless imprisoned (deals 0). A **base** deals nothing back.
   - **Breakthrough N:** if the defending unit is destroyed, excess damage beyond lethal — capped at N — hits the defender's controller's Life.
4. `onAttack` triggers fire when the attack is declared; `onDefend` triggers (Yellow's "when this unit defends, gain 1 Influence") fire when a unit is chosen as the target.
5. Destroyed units (damage ≥ health) go to their owner's discard with their upgrades. Damage persists between turns otherwise.

### 1.8 Moving (⚑ new rule — v1.2 has none)

Move one friendly ready, non-summoning-sick unit to an **adjacent zone**; the unit **exhausts**. **Flying** may move to *any* zone. Imprisoned units cannot move.

### 1.9 Activated abilities

Printed as "Exhaust: effect" — exhaust the ready unit, resolve the effect. (Only a handful of cards use this.)

### 1.10 Influence

- One shared track, stored as a signed integer from the host seat's perspective; each player's UI shows "you vs them."
- "Gain N Influence" moves the track N toward your +15. "Opponent loses N" ≡ you gain N.
- **Win:** track at ±`influenceWinThreshold` (15) after any atomic change → that side wins (subject to §1.12 ordering). Static effects can modify a player's threshold (Radiant Citadel).
- Track clamps at the winning value (no overshoot bookkeeping).

### 1.11 Prison

- **Imprison:** target unit becomes imprisoned (stays in its zone, keeps upgrades/damage). It cannot attack, move, defend (deals no counter-damage), or use abilities; its Guard is inert; it still counts as a unit for zone effects.
- **Sources:** unit-sourced prisons (from a unit's trigger) end when that unit leaves play. Action-sourced prisons have no in-play source and persist until another condition ends them.
- **Decay (v1.2):** at the start of the jailer's turn, jailer loses 1 Influence per unit they hold imprisoned. Cards restating this are reminder text — no double charge.
- **Release threshold (⚑ default 0):** the moment a jailer's Influence is negative (track on their opponent's side), **all their prisons release**.
- Released or source-dead prisons end immediately; the unit stays exhausted/ready as it was.

### 1.12 Winning, losing, simultaneity

Checked after every atomic state change, in order:

1. **Life:** any player at ≤0 Life loses. If **both** are ≤0 from the same change, the player who submitted the causing action **wins**.
2. **Influence:** track at a winning threshold → that side wins.
3. Concede: immediate loss.

First check that fires ends the game; later checks don't run.

### 1.13 Determinism

Same `(rulesConfig, decks, seed, action list)` ⇒ identical states and events, always. All randomness (shuffles, coin flip) flows through the seeded RNG. No wall-clock, no I/O, no hidden nondeterminism. Trigger resolution order is defined (active player first, then by unit entry order). This contract enables replay, undo, reconnection, and simulation.

---

## 2. Parameters (`RulesConfig` — admin-editable, versioned)

| Key | Default | Meaning |
|---|---|---|
| `startingLife` | 20 | Life each player starts with; also the healing cap |
| `influenceWinThreshold` | 15 | Track value that wins (per side; static effects may raise a side's) |
| `startingHandSize` | 7 | Cards drawn at setup |
| `startingResources` | 2 | Auto-resourced at setup |
| `drawPerTurn` | 2 | Draw phase count |
| `firstTurnDraw` | 1 | Draw count for the game's very first turn |
| `resourcesPerTurn` | 1 | Max cards resourced per Resource phase |
| `deckMinSize` | 48 | Deck legality floor |
| `maxCopies` | 4 | Per-slug copy ceiling |
| `upgradePressureInfluence` | 1 | Influence the opponent gains per beyond-first upgrade |
| `prisonDecayPerUnit` | 1 | Influence lost per imprisoned unit at jailer's turn start |
| `prisonReleaseThreshold` | 0 | Jailer influence below this ⇒ prisons release |
| `chooseStartingResources` | true | Setup: players pick their starting banks (false = auto-bank last drawn) |
| `summoningSickness` | true | Units can't attack/move the turn they enter |
| `moveExhausts` | true | Moving exhausts the unit |
| `simultaneousLifeTiebreak` | `"actor"` | Who wins a both-dead tie: `actor` \| `active` \| `draw` |

---

## 3. Effect vocabulary

Cards carry structured effects — never free text — so the engine can validate every card (GENESYS: a new card must not silently break games).

### 3.1 Keywords (static, on units)

`guard`, `armor N`, `rush`, `ranged`, `flying` (⚑), `breakthrough N`, `overextendUnit N` (+N Power attacking alone-in-zone), `cantAttack`, `untargetable` (can't be targeted by enemy actions/upgrades — Chain of Law).

### 3.2 Effect ops (one-shot, run in order)

| Op | Params | Notes |
|---|---|---|
| `damage` | target, amount | unit or base; Armor reduces **all** damage to a unit, combat or effect (v1.2: "reduces incoming damage by X") |
| `damageAll` | scope (zone/all/enemy), amount | e.g. Scorching Howl |
| `heal` | target, amount | unit damage or base life (capped) |
| `draw` | count | |
| `influence` | amount (±, from controller's view) | Overextend-on-action = `influence: -N` |
| `imprison` | target(s) or filter (e.g. power ≤ N, all-in-zone) | source recorded |
| `release` | target | |
| `buff` | target, power/health delta, duration (`turn`/`permanent`) | |
| `grantKeyword` | target, keyword, duration | e.g. "target unit gains Rush" |
| `destroy` | target, constraint (e.g. damaged, upgrade) | |
| `readyUnits` | scope | "extra combat phase" cards |
| `extraTurn` | — | Final Onslaught |
| `moveUnit` | target, zone | |
| `preventBaseDamage` | amount, duration turn | Devout Intervention |
| `removeNegative` | target | clears imprisonment + negative modifiers (Absolution) |
| `thresholdMod` | side, delta, while-in-play | Radiant Citadel ⚑ |

### 3.3 Triggers (on units/upgrades)

`onEnter` (play or zone entry), `onAttack`, `onDefend`, `onAttackBase`, `onKill`, `startOfTurn` (controller's), `endOfTurn`, `onAnyImprisoned` (Gateward Colossus), `onDestroyed`.

Each trigger holds effect ops. Targets a trigger needs are declared in the submitted action (`onEnter` imprisons, etc.); start-of-turn triggers that need targets use a deterministic default (⚑ e.g. High Justiciar imprisons the highest-power eligible enemy unit; flagged on the card).

### 3.4 Statics (continuous while in play)

`aura` — grants keyword or ±power to a filtered set (friendly-in-zone, all-friendly, other-friendly), with optional condition (`influence ≥ 10` — Hierophant); `thresholdMod`; `imprisonWatcher`.

### 3.5 Escape hatch

A card may reference a named custom routine implemented in the engine (`custom: "vanguard-commander"`). Ships empty tonight; exists so one weird future card doesn't force a DSL redesign.

---

## 4. Deck legality

≥ `deckMinSize` total, ≤ `maxCopies` per slug, single color not enforced (⚑ color identity rules don't exist yet).

## 5. Undo (playtest affordance, ⚑)

Either player may rewind the last action (event-sourced replay of `actions[0..n-1]`). Logged in the game log as "X undid Y". Hidden-information leaks (an undone draw) are accepted — this is a trust-based tool for two collaborators.
