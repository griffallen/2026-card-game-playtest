# Turn Structure v2.0 (Rounds + Initiative + Multi-Unit Combat) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-player turns with shared rounds + claimable initiative, remove summoning sickness (Rush = exhaust-free entry-round move), and replace single-attacker combat with multi-unit attack + defender intercept — per `docs/SPECS/game-rules.md` v2.0-proto (decisions 40–44 in `docs/DESIGN/DECISIONS.md`).

**Architecture:** The engine (`packages/engine`) is a pure event-sourced reducer: `applyAction(state, action, seat)`. The rework changes the state machine (`phase: setup → bank → loop → intercept`), the action vocabulary (multi-attacker `attack`, `claimInitiative`, `intercept`/`declineIntercept`), and combat resolution. Everything downstream (legal-action enumeration, AI, views, demo/web UIs, sim harness) re-derives from those. The intercept prompt is the game's first mid-action prompt, implemented as a phase the defender must answer — exactly like the existing setup phase pattern.

**Tech Stack:** TypeScript (Node 22, `.ts` imports, no build step for engine), vitest (`npm test` at repo root runs `packages/engine`), React+Vite for `apps/demo` and `apps/web`. No new dependencies.

## Global Constraints

- **The spec is the contract:** `docs/SPECS/game-rules.md` (v2.0-proto). When this plan and the spec disagree, the spec wins — stop and flag.
- **Determinism:** same `(rulesConfig, decks, seed, action list)` ⇒ identical states. No `Date.now`, no unseeded randomness. All iteration over units uses `unitsOf()` (id-sorted).
- **TDD:** every behavior change lands as failing test → implementation → green → commit. Run `npm test` from the repo root.
- **No new dependencies** beyond `docs/DESIGN/02-TECH-STACK.md`.
- **Breaking change accepted:** v1 exported game files / replays will not load under v2. Do not build a migration layer (YAGNI — playtest files are disposable).
- Commit messages: conventional style, e.g. `feat(engine): round structure with claimable initiative (decision 40)`.
- The 71 existing tests speak "turn" — each task updates the tests it breaks; the suite must be green at the end of every task.

## New vocabulary (used across all tasks — read once, refer back)

**`RulesConfig` renames/additions** (`packages/engine/src/types.ts` + `rules.ts`):

| Old | New | Default |
|---|---|---|
| `drawPerTurn` | `drawPerRound` | 2 |
| `firstTurnDraw` | `firstRoundDraw` | **2** (decision 44) |
| `resourcesPerTurn` | `resourcesPerRound` | 1 |
| `summoningSickness` | (kept) | **false** (decision 41) |
| — | `rushCoversAttack` | false |
| — | `interceptExhausts` | true |
| — | `counterAssignment` | `'auto'` (only value implemented; type allows `'defender'` for later) |
| — | `armorPerAttack` | `'once'` (only value implemented; type allows `'perAttacker'`) |
| — | `maxAttackers` | 0 (= unlimited) |

**`GameState` changes:**

```ts
// REMOVED: turn, activeSeat, resourcedThisTurn, firstPlayer, pendingExtraTurn
// RENAMED: phase values
round: number                       // was `turn`; increments once per full round
initiative: Seat                    // holder acts first each round; replaces activeSeat/firstPlayer
phase: 'setup' | 'bank' | 'loop' | 'intercept'
startStep: Seat | null              // phase 'bank': whose start step is paused at its bank choice
bankedThisStep: number              // was resourcedThisTurn
outOfRound: [boolean, boolean]      // true = claimed initiative, done acting this round
claimedThisRound: boolean           // at most one claim per round
pendingExtraAction: Seat | null     // was pendingExtraTurn (decision 43)
pendingAttack: {                    // phase 'intercept': the declared attack awaiting the defender
  seat: Seat; attackers: string[]; target: TargetRef; overextend: string[]
} | null
```

**`UnitInstance`:** `enteredTurn` → `enteredRound`. **`Mod`:** `turn?: boolean` → `round?: boolean`.

**`GameAction` changes:**

```ts
// CHANGED:
| { type: 'attack'; attackers: string[]; target: TargetRef; overextend?: string[] }
//   attackers: 1+ unit ids, one zone; overextend: subset of attackers taking the gamble (decision 35/42)
// NEW:
| { type: 'claimInitiative' }
| { type: 'intercept'; unit: string }
| { type: 'declineIntercept' }
// UNCHANGED names, new home: 'resource'/'skipResource' now happen in phase 'bank'
```

**`Op` changes:** `{ op: 'ready'; side: 'friendly'; t?: 'chosen0' }` (with `t`, readies only that chosen unit); `{ op: 'extraTurn' }` → `{ op: 'extraAction' }`.

**`CardDef`:** `startOfTurn` → `startOfRound`. `dur: 'turn'` → `dur: 'round'` everywhere (Op `buff`/`grant`).

**`PlayerView`:** `turn/phase/activeSeat` → `round`, `phase` (new values), `initiative: Seat`, `outOfRound: [boolean, boolean]`, `claimedThisRound: boolean`, `pendingAttack: { attackers: string[]; target: TargetRef } | null`. `UnitView.sick` removed; add `rushFreeMove: boolean` (true when the unit's move wouldn't exhaust it this round — drives the UI hint).

**Round lifecycle** (spec §1.4–1.5):

```
startRound: log header → runStartStepAuto(initiative) → phase='bank', startStep=initiative, actorSeat=initiative
  runStartStepAuto(seat): prison decay → startOfRound triggers (own units, id order) → ready all → draw
bank input (resource × up to resourcesPerRound, then skipResource or cap reached):
  if startStep === initiative → runStartStepAuto(other); startStep=other; actorSeat=other; bankedThisStep=0
  else → phase='loop'; startStep=null; actorSeat=initiative; passStreak=0
loop: alternate actions. After seat S acts (non-pass):
  passStreak=0
  if pendingExtraAction===S → clear it, actorSeat stays S
  else actorSeat = outOfRound[other(S)] ? S : other(S)
pass: if outOfRound[other(S)] OR ++passStreak>=2 → endRound; else actorSeat=other(S)
claimInitiative: legal iff !claimedThisRound. initiative=S; claimedThisRound=true; outOfRound[S]=true;
  if outOfRound[other(S)] → endRound (defensive; unreachable) else actorSeat=other(S), passStreak=0
endRound: overextend bills (all units, id order) → expire round-mods → preventBase=[0,0] → cleanup →
  outOfRound=[false,false]; claimedThisRound=false; round+=1 → startRound
```

**Attack lifecycle** (spec §1.7): declare (validate group, exhaust, per-unit OE, `onAttack` per attacker) → if any legal interceptor exists: `phase='intercept'`, `actorSeat=defender`, store `pendingAttack`, wait; else resolve immediately. Interceptor legality: defender-owned, ready, non-imprisoned, in the **target's zone**, not the declared target unit itself. Resolve: `onDefend` on final target unit (interceptor counts); combined power, armor once; counter to highest-power surviving attacker (tie → lowest `idNum`), no counter if cross-zone and that attacker has `ranged`; breakthrough cap = **sum** of attackers' values; `onAttackBase`/`onKill` per surviving attacker. After resolution: `phase='loop'`, `pendingAttack=null`, next-actor logic runs for the **attacker's** seat.

---

### Task 1: State machine skeleton — types, rules, setup, round lifecycle

The engine's compile-level core. This task is deliberately larger than the others because `types.ts` changes ripple everywhere; it ends with the whole suite green again.

**Files:**
- Modify: `packages/engine/src/types.ts` (all changes from "New vocabulary" above)
- Modify: `packages/engine/src/rules.ts` (DEFAULT_RULES renames + new params)
- Modify: `packages/engine/src/setup.ts` (state literal, log line)
- Rename: `packages/engine/src/turn.ts` → `packages/engine/src/round.ts` (`startRound`, `runStartStepAuto`, `finishBankStep`, `endRound`)
- Modify: `packages/engine/src/engine.ts` (dispatch: bank phase, loop phase pass/claim, next-actor helper; attack/move stay single-unit this task — mechanical rename only)
- Modify: `packages/engine/src/helpers.ts` (`log` uses `state.round`; `isSick` reads `enteredRound`/`state.round`; `draw` unchanged; `checkWin` tiebreak `'active'` now means initiative holder)
- Modify: `packages/engine/src/legal.ts` (phase names; `resource` gated by `bankedThisStep`; add `claimInitiative`; keep move/attack gated to... **no gate** — both players act in their windows now, delete the `isActive` gate)
- Modify: `packages/engine/src/effects.ts` (`extraTurn` case → `extraAction` setting `pendingExtraAction`; `Mod.round`; log "this round")
- Modify: `packages/engine/src/validate.ts` (`extraTurn`→`extraAction` in OPS set; `startOfTurn`→`startOfRound` key; `dur` accepts only `'round' | 'perm'`)
- Modify: `packages/engine/src/index.ts` (export rename if it exports turn.ts symbols)
- Modify: `packages/engine/src/cards/red.ts`, `yellow.ts`, `builders.ts` (mechanical: `startOfTurn`→`startOfRound`, `dur:'turn'`→`dur:'round'`, final-onslaught keeps `extraTurn`→ becomes `extraAction` here, ready-one target added in Task 4)
- Test: `packages/engine/test/round.test.ts` (new), plus mechanical updates to `test/util.ts`, `flow.test.ts`, `setup.test.ts`, `effects.test.ts`, `combat.test.ts`, `cards.test.ts`, `ai.test.ts`, `simulate.test.ts`
- Modify: `packages/engine/src/simulate.ts`, `src/view.ts` — minimal mechanical renames so the package compiles (full view rework is Task 6)

**Interfaces:**
- Consumes: nothing (root task).
- Produces: the "New vocabulary" section verbatim — every later task assumes those exact names. `round.ts` exports `startRound(state)`, `endRound(state, actorSeat: Seat)`, `finishBankStep(state)`. `engine.ts` exports unchanged `applyAction(prev, action, actorSeat)`.

- [ ] **Step 1: Write the failing round-lifecycle tests**

Create `packages/engine/test/round.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { game, put, fuel } from './util.ts'
import type { GameState, Seat } from '../src/types.ts'

/** Drive both bank steps with skips: state at loop start, initiative acts first. */
function toLoop(state: GameState): GameState {
  while (state.phase === 'bank') state = applyAction(state, { type: 'skipResource' }, state.actorSeat).state
  return state
}

describe('round structure (decision 40)', () => {
  it('runs both start steps in initiative order, then the loop starts with initiative', () => {
    let s = game() // zero-input setup → startRound already ran for initiative
    const first = s.initiative
    expect(s.phase).toBe('bank')
    expect(s.startStep).toBe(first)
    expect(s.actorSeat).toBe(first)
    // both players drew firstRoundDraw = drawPerRound = 2 by the time their bank window opens
    expect(s.sides[first].hand.length).toBe(7 + 2) // zero-input setup auto-banked 2 of 7, then drew 2... see note
    s = applyAction(s, { type: 'skipResource' }, first).state
    const second = (1 - first) as Seat
    expect(s.startStep).toBe(second)
    expect(s.actorSeat).toBe(second)
    s = applyAction(s, { type: 'skipResource' }, second).state
    expect(s.phase).toBe('loop')
    expect(s.actorSeat).toBe(first)
  })

  it('banking a card is limited by resourcesPerRound and ends the step', () => {
    let s = game()
    const seat = s.actorSeat
    const card = s.sides[seat].hand[0]
    s = applyAction(s, { type: 'resource', card }, seat).state
    // cap = 1 → step auto-advances to the other seat's bank window
    expect(s.startStep).toBe(1 - seat)
  })

  it('two consecutive passes end the round; initiative stays when unclaimed', () => {
    let s = toLoop(game())
    const first = s.initiative
    expect(s.round).toBe(1)
    s = applyAction(s, { type: 'pass' }, s.actorSeat).state
    s = applyAction(s, { type: 'pass' }, s.actorSeat).state
    expect(s.round).toBe(2)
    expect(s.initiative).toBe(first)
    expect(s.phase).toBe('bank') // next round's start steps have begun
  })

  it('pass is soft: acting after an opponent pass reopens theirs', () => {
    let s = toLoop(game())
    const a = s.actorSeat, b = (1 - a) as Seat
    fuel(s, b, 1)
    s = applyAction(s, { type: 'pass' }, a).state
    const cheap = s.sides[b].hand.find(id => s.cardOf[id] === 'pawn')!
    s = applyAction(s, { type: 'play', card: cheap }, b).state
    expect(s.round).toBe(1)          // round did NOT end
    expect(s.actorSeat).toBe(a)      // a may act again
    expect(s.passStreak).toBe(0)
  })

  it('claimInitiative takes the token, exits the round, opponent continues solo', () => {
    let s = toLoop(game())
    const a = s.actorSeat, b = (1 - a) as Seat
    s = applyAction(s, { type: 'claimInitiative' }, a).state
    expect(s.initiative).toBe(a)
    expect(s.outOfRound[a]).toBe(true)
    expect(s.actorSeat).toBe(b)
    fuel(s, b, 1)
    const cheap = s.sides[b].hand.find(id => s.cardOf[id] === 'pawn')!
    s = applyAction(s, { type: 'play', card: cheap }, b).state
    expect(s.actorSeat).toBe(b)      // solo: window stays with b
    s = applyAction(s, { type: 'pass' }, b).state
    expect(s.round).toBe(2)          // single pass ends it after a claim
    expect(s.initiative).toBe(a)     // a goes first next round
  })

  it('a second claim in the same round is illegal', () => {
    let s = toLoop(game())
    const a = s.actorSeat, b = (1 - a) as Seat
    s = applyAction(s, { type: 'claimInitiative' }, a).state
    expect(() => applyAction(s, { type: 'claimInitiative' }, b)).toThrow()
  })

  it('the holder may claim their own token to lock it (decision 40)', () => {
    let s = toLoop(game())
    const holder = s.initiative
    s = applyAction(s, { type: 'claimInitiative' }, holder).state
    expect(s.initiative).toBe(holder)
    expect(s.outOfRound[holder]).toBe(true)
  })

  it('everyone readies at their own start step — both boards untap each round', () => {
    let s = toLoop(game())
    const a = s.actorSeat, b = (1 - a) as Seat
    const ua = put(s, a, 'soldier', 1, { exhausted: true, enteredRound: 0 })
    const ub = put(s, b, 'soldier', 1, { exhausted: true, enteredRound: 0 })
    s = applyAction(s, { type: 'pass' }, s.actorSeat).state
    s = applyAction(s, { type: 'pass' }, s.actorSeat).state
    s = toLoop(s) // round 2 loop
    expect(s.units[ua].exhausted).toBe(false)
    expect(s.units[ub].exhausted).toBe(false)
  })

  it('round 1 draws firstRoundDraw for BOTH players (decision 44: = drawPerRound)', () => {
    const s = game()
    expect(s.rules.firstRoundDraw).toBe(2)
    expect(s.rules.drawPerRound).toBe(2)
  })

  it('extraAction lets the same player act twice (decision 43 plumbing)', () => {
    let s = toLoop(game())
    const a = s.actorSeat
    s.pendingExtraAction = a
    fuel(s, a, 1)
    const cheap = s.sides[a].hand.find(id => s.cardOf[id] === 'pawn')!
    s = applyAction(s, { type: 'play', card: cheap }, a).state
    expect(s.actorSeat).toBe(a)
    expect(s.pendingExtraAction).toBe(null)
  })
})
```

Note on the first test's hand-count assertion: with `chooseStartingResources:false` the fixture auto-banks 2 of the 7 drawn, leaving 5, then the round-1 start step draws 2 → 7. Assert `toBe(7)` — fix the expectation in the test to match (the inline comment above is the reasoning; the literal in the committed test must be 7).

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npm test -- round` (from repo root)
Expected: FAIL — `state.initiative`/`phase 'bank'` don't exist yet; type errors across the suite.

- [ ] **Step 3: Implement the state machine**

3a. `types.ts`: apply every change in "New vocabulary" verbatim. `put()` in `test/util.ts` gains `enteredRound` (rename of `enteredTurn` opt).

3b. `rules.ts`:

```ts
export const DEFAULT_RULES: RulesConfig = {
  startingLife: 20,
  influenceWinThreshold: 15,
  startingHandSize: 7,
  startingResources: 2,
  chooseStartingResources: true,
  mulliganPenalty: 1,
  emptyDrawLifeLoss: 1,
  emptyDrawInfluenceLoss: 1,
  drawPerRound: 2,
  firstRoundDraw: 2,          // decision 44: no round-1 asymmetry
  resourcesPerRound: 1,
  deckMinSize: 48,
  maxCopies: 4,
  upgradePressureInfluence: 1,
  prisonDecayPerUnit: 1,
  prisonReleaseThreshold: 0,
  summoningSickness: false,   // decision 41: units enter ready
  moveExhausts: true,
  rushCoversAttack: false,
  interceptExhausts: true,
  counterAssignment: 'auto',
  armorPerAttack: 'once',
  maxAttackers: 0,
  simultaneousLifeTiebreak: 'actor',
}
```

`normalizeRules` also maps legacy keys if present (`drawPerTurn`→`drawPerRound` etc.) — three lines, keeps stored server configs loading:

```ts
export function normalizeRules(partial: Partial<RulesConfig> & Record<string, unknown> | null | undefined): RulesConfig {
  const p: Record<string, unknown> = { ...(partial ?? {}) }
  for (const [old, nu] of [['drawPerTurn', 'drawPerRound'], ['firstTurnDraw', 'firstRoundDraw'], ['resourcesPerTurn', 'resourcesPerRound']] as const) {
    if (old in p && !(nu in p)) p[nu] = p[old]
    delete p[old]
  }
  return { ...DEFAULT_RULES, ...(p as Partial<RulesConfig>) }
}
```

3c. `round.ts` (rename `turn.ts`; `git mv packages/engine/src/turn.ts packages/engine/src/round.ts`):

```ts
import type { GameState, Seat } from './types.ts'
import { addInfluence, condHolds, defOf, draw, log, other, unitsOf } from './helpers.ts'
import { runOps, stateBasedCleanup } from './effects.ts'

/** One seat's automatic start-step: decay → startOfRound triggers → ready → draw (spec §1.4). */
function runStartStepAuto(state: GameState, seat: Seat) {
  const held = unitsOf(state).filter(u => u.imprisoned?.by === seat).length
  if (held > 0 && state.rules.prisonDecayPerUnit > 0) {
    addInfluence(state, seat, -held * state.rules.prisonDecayPerUnit)
    log(state, seat, `${state.sides[seat].name} pays ${held * state.rules.prisonDecayPerUnit} influence to hold ${held} prisoner${held > 1 ? 's' : ''}`)
    stateBasedCleanup(state, seat)
  }
  if (state.winner !== null) return

  for (const u of unitsOf(state, seat)) {
    if (state.winner !== null) return
    if (u.imprisoned) continue
    const own = defOf(state, u.id).startOfRound
    if (own && condHolds(state, seat, own.cond)) {
      runOps({ state, controller: seat, sourceUnit: u.id, actorSeat: seat }, own.ops)
    }
    for (const upId of u.upgrades) {
      const up = defOf(state, upId).startOfRound
      if (up && condHolds(state, seat, up.cond)) {
        runOps({ state, controller: seat, sourceUnit: u.id, actorSeat: seat }, up.ops)
      }
    }
  }

  for (const u of unitsOf(state, seat)) u.exhausted = false
  for (const r of state.sides[seat].resources) r.exhausted = false

  const n = state.round === 1 ? state.rules.firstRoundDraw : state.rules.drawPerRound
  draw(state, seat, n)
  log(state, seat, `${state.sides[seat].name} draws ${n} card${n === 1 ? '' : 's'}`)
  stateBasedCleanup(state, seat)
}

/** Begin a round: initiative's start step runs, then pauses at their bank choice. */
export function startRound(state: GameState) {
  log(state, null, `— Round ${state.round} · ${state.sides[state.initiative].name} has the initiative —`)
  runStartStepAuto(state, state.initiative)
  if (state.winner !== null) return
  state.phase = 'bank'
  state.startStep = state.initiative
  state.actorSeat = state.initiative
  state.bankedThisStep = 0
}

/** A seat finished banking: run the other start step, or open the action loop. */
export function finishBankStep(state: GameState) {
  const seat = state.startStep
  if (seat === null) return
  if (seat === state.initiative) {
    const next = other(seat)
    runStartStepAuto(state, next)
    if (state.winner !== null) return
    state.startStep = next
    state.actorSeat = next
    state.bankedThisStep = 0
  } else {
    state.startStep = null
    state.phase = 'loop'
    state.actorSeat = state.initiative
    state.passStreak = 0
  }
}

/** End of round: overextend bills, round-mods expire, flags reset, next round begins (spec §1.4). */
export function endRound(state: GameState, actorSeat: Seat) {
  for (const u of unitsOf(state)) {
    if (u.overextendedBy > 0) {
      u.damage += u.overextendedBy // self-inflicted strain ignores armor (decision 35)
      log(state, u.owner, `${defOf(state, u.id).name} suffers ${u.overextendedBy} from overextending`)
      u.overextendedBy = 0
    }
  }
  for (const u of unitsOf(state)) u.mods = u.mods.filter(m => !m.round)
  state.preventBase = [0, 0]
  stateBasedCleanup(state, actorSeat)
  if (state.winner !== null) return

  state.outOfRound = [false, false]
  state.claimedThisRound = false
  state.pendingExtraAction = null
  state.round += 1
  startRound(state)
}
```

3d. `engine.ts`: replace `applyResourcePhase`/`applyMainPhase` with:

```ts
/** After seat S completes a non-pass action, decide the next window (spec §1.5). */
function advanceWindow(state: GameState, seat: Seat) {
  state.passStreak = 0
  if (state.pendingExtraAction === seat) {
    state.pendingExtraAction = null
    log(state, seat, `${state.sides[seat].name} seizes an extra action`)
    state.actorSeat = seat
    return
  }
  state.pendingExtraAction = null // an opponent-granted flag can't survive their window
  const opp = other(seat)
  state.actorSeat = state.outOfRound[opp] ? seat : opp
}

function applyBankPhase(state: GameState, action: GameAction, seat: Seat) {
  if (action.type === 'resource') {
    if (state.bankedThisStep >= state.rules.resourcesPerRound) fail('resource-cap', 'already banked this step')
    const side = state.sides[seat]
    const idx = side.hand.indexOf(action.card)
    if (idx < 0) fail('not-in-hand', 'card is not in your hand')
    side.hand.splice(idx, 1)
    side.resources.push({ id: action.card, exhausted: false })
    state.bankedThisStep += 1
    log(state, seat, `${side.name} banks ${defOf(state, action.card).name} as a resource (${side.resources.length})`)
  } else if (action.type !== 'skipResource') {
    fail('bad-phase', 'start step: bank a card or skip')
  }
  if (state.bankedThisStep >= state.rules.resourcesPerRound || action.type === 'skipResource') {
    finishBankStep(state)
  }
}

function applyLoopPhase(state: GameState, action: GameAction, seat: Seat) {
  switch (action.type) {
    case 'pass': {
      const opp = other(seat)
      state.passStreak += 1
      if (state.outOfRound[opp] || state.passStreak >= 2) { endRound(state, seat); return }
      state.actorSeat = opp
      return
    }
    case 'claimInitiative': {
      if (state.claimedThisRound) fail('claimed', 'initiative was already claimed this round')
      state.initiative = seat
      state.claimedThisRound = true
      state.outOfRound[seat] = true
      log(state, seat, `${state.sides[seat].name} claims the initiative`)
      const opp = other(seat)
      if (state.outOfRound[opp]) { endRound(state, seat); return }
      state.actorSeat = opp
      state.passStreak = 0
      return
    }
    case 'play': playCard(state, action, seat); break
    case 'move': moveUnit(state, action.unit, action.to, seat); break
    case 'attack': {
      attackDeclare(state, action, seat) // Task 4 replaces the single-attacker body
      if (state.phase === 'intercept') return // defender's window is open; attacker's action completes on resolve
      break
    }
    default: fail('bad-phase', `${(action as GameAction).type} is not a loop action`)
  }
  advanceWindow(state, seat)
}
```

Dispatch in `applyAction`: `setup → applySetupPhase` (its final branch calls `startRound(state)` instead of `startTurn`), `bank → applyBankPhase`, `intercept → applyInterceptPhase` (Task 4; until then `fail('bad-phase', ...)`), `loop → applyLoopPhase`. In this task, `attackDeclare` is the old single-attacker `attack()` reading `action.attackers[0]` and `overextend: action.overextend?.includes(attackerId)` — mechanically adapted, still no intercept; move/attack lose the `isActive` gate and the `isSick` checks change to: `if (state.rules.summoningSickness && unit.enteredRound === state.round && !hasKw(state, unit, 'rush')) fail('sick', ...)`.

3e. `setup.ts` state literal:

```ts
const state: GameState = {
  rngState, rules, cardSet, cardOf,
  round: 1,
  initiative: first as Seat,
  phase: rules.chooseStartingResources ? 'setup' : 'bank', // startRound overwrites when it runs
  actorSeat: first as Seat,
  startStep: null,
  bankedThisStep: 0,
  outOfRound: [false, false],
  claimedThisRound: false,
  setupBanked: [!rules.chooseStartingResources, !rules.chooseStartingResources],
  mulligans: [0, 0],
  passStreak: 0,
  pendingExtraAction: null,
  pendingAttack: null,
  influence: 0, sides, units: {}, upgrades: {},
  preventBase: [0, 0], winner: null, winReason: null, log: [], nextId,
}
log(state, null, `${sides[0].name} vs ${sides[1].name} — ${sides[first as Seat].name} takes the initiative`)
if (rules.chooseStartingResources) {
  log(state, null, `Setup: each player banks ${rules.startingResources} starting resources, ${sides[first as Seat].name} first`)
} else {
  startRound(state)
}
```

3f. `helpers.ts`: `log()` uses `state.round`; `isSick` becomes:

```ts
export function isSick(state: GameState, unit: UnitInstance): boolean {
  if (!state.rules.summoningSickness) return false
  return unit.enteredRound === state.round && !hasKw(state, unit, 'rush')
}
```

`checkWin` tiebreak: `w = tb === 'active' ? state.initiative : actorSeat`.

3g. `legal.ts`: phase `'bank'` returns resource options (gated by `bankedThisStep < resourcesPerRound`) + `skipResource`; phase `'loop'` returns `pass`, `claimInitiative` (iff `!claimedThisRound`), plays, and — **for any actor, no isActive gate** — moves and attacks (attack enumeration stays single-attacker `attackers: [unit.id]` this task; delete the guard-forced-targeting filter only in Task 4). Delete the `isSick` skip when `summoningSickness` is false (call `isSick` — it already returns false).

3h. `effects.ts`: `case 'extraAction': { state.pendingExtraAction = controller; log(...) }`; `Mod` pushes `round: op.dur === 'round'`; expiry filter moved in 3c. `validate.ts`: OPS set swaps `extraTurn`→`extraAction`; trigger key `startOfTurn`→`startOfRound`; `dur` must be `'round' | 'perm'`.

3i. Cards: in `cards/red.ts`, `cards/yellow.ts`, `cards/builders.ts` run the mechanical rename (`startOfTurn`→`startOfRound`, `'turn'`→`'round'` for `dur`, `extraTurn`→`extraAction`). Grep to confirm none remain: `grep -rn "startOfTurn\|dur: 'turn'\|extraTurn" packages/engine/src`.

3j. Test sweep: update `test/util.ts` (`enteredRound`), and in every failing test replace turn-structure driving (`skipResource` once per turn) with the two-bank-steps helper (`toLoop` pattern from round.test.ts — put it in `test/util.ts` as an export and reuse). Semantics that changed and tests must now assert differently: both players draw every round; both players can move/attack in their windows; `state.turn`→`state.round` counts full rounds (games are "shorter" in round numbers).

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS (all files). Fix stragglers — usually a stale `phase: 'resource'`/`'main'` literal or `activeSeat` reference. `grep -rn "activeSeat\|phase === 'main'\|phase === 'resource'\|drawPerTurn\|resourcesPerTurn\|firstTurnDraw\|pendingExtraTurn\|enteredTurn" packages/engine` must return nothing.

- [ ] **Step 5: Commit**

```bash
git add -A packages/engine
git commit -m "feat(engine): rounds with claimable initiative replace per-player turns (decisions 40,43,44)"
```

---

### Task 2: Decision 41 — units enter ready; Rush = exhaust-free entry-round move

**Files:**
- Modify: `packages/engine/src/engine.ts` (`moveUnit`)
- Modify: `packages/engine/src/view.ts` (`UnitView.rushFreeMove`; remove `sick` — full view rework is Task 6, but these two fields move now with their tests)
- Test: `packages/engine/test/rush.test.ts` (new)

**Interfaces:**
- Consumes: Task 1 state machine (`toLoop` helper, `put(state, seat, slug, zone, { enteredRound })`).
- Produces: `moveUnit` behavior — later UI tasks read `UnitView.rushFreeMove: boolean`.

- [ ] **Step 1: Write the failing tests**

Create `packages/engine/test/rush.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { game, put, fuel, toLoop } from './util.ts'

describe('decision 41: no summoning sickness, Rush = free entry-round move', () => {
  it('a freshly played unit can attack later this same round', () => {
    let s = toLoop(game())
    const a = s.actorSeat
    fuel(s, a, 2)
    put(s, (1 - a) as 0 | 1, 'pawn', a === 0 ? 0 : 2, { enteredRound: 0 }) // enemy in my home
    const soldier = s.sides[a].hand.find(id => s.cardOf[id] === 'soldier')
      ?? (() => { throw new Error('fixture: no soldier in hand — reseed') })()
    s = applyAction(s, { type: 'play', card: soldier }, a).state
    s = applyAction(s, { type: 'pass' }, (1 - a) as 0 | 1).state
    const enemy = Object.values(s.units).find(u => u.owner !== a)!
    s = applyAction(s, { type: 'attack', attackers: [soldier], target: { kind: 'unit', id: enemy.id } }, a).state
    expect(s.units[soldier]?.exhausted).toBe(true) // it attacked — no sickness gate fired
  })

  it('a non-rush unit that moves the round it entered exhausts as normal', () => {
    let s = toLoop(game())
    const a = s.actorSeat
    const id = put(s, a, 'soldier', a === 0 ? 0 : 2, { enteredRound: s.round })
    s = applyAction(s, { type: 'move', unit: id, to: 1 }, a).state
    expect(s.units[id].exhausted).toBe(true)
  })

  it('a Rush unit moves without exhausting the round it entered — and can still attack', () => {
    let s = toLoop(game())
    const a = s.actorSeat
    const id = put(s, a, 'runner', a === 0 ? 0 : 2, { enteredRound: s.round })
    put(s, (1 - a) as 0 | 1, 'pawn', 1, { enteredRound: 0 })
    s = applyAction(s, { type: 'move', unit: id, to: 1 }, a).state
    expect(s.units[id].exhausted).toBe(false) // Rush waived the exhaust
    s = applyAction(s, { type: 'pass' }, (1 - a) as 0 | 1).state
    const enemy = Object.values(s.units).find(u => u.owner !== a && u.zone === 1)!
    s = applyAction(s, { type: 'attack', attackers: [id], target: { kind: 'unit', id: enemy.id } }, a).state
    expect(s.units[id]?.exhausted).toBe(true) // the attack still exhausts (rushCoversAttack=false)
  })

  it("Rush's waiver expires after the entry round", () => {
    let s = toLoop(game())
    const a = s.actorSeat
    const id = put(s, a, 'runner', a === 0 ? 0 : 2, { enteredRound: 0 }) // a veteran
    s = applyAction(s, { type: 'move', unit: id, to: 1 }, a).state
    expect(s.units[id].exhausted).toBe(true)
  })

  it('granted Rush on a veteran works mid-round (playtest finding 6 resolved)', () => {
    let s = toLoop(game())
    const a = s.actorSeat
    const id = put(s, a, 'soldier', a === 0 ? 0 : 2, { enteredRound: 0 })
    s.units[id].enteredRound = s.round // simulate "entered this round" via grant semantics below
    s.units[id].mods.push({ kw: { k: 'rush' }, round: true })
    s = applyAction(s, { type: 'move', unit: id, to: 1 }, a).state
    expect(s.units[id].exhausted).toBe(false)
  })
})
```

Note: the granted-Rush test pins the *chosen* semantics — Rush's waiver keys on `enteredRound === round && hasKw(rush)`. A veteran granted Rush did not enter this round, so RAW it still exhausts; the test above forces `enteredRound` to document that boundary. **Design note for the implementer:** decision 41 says the waiver applies "the round it enters play." Granted-Rush-on-veterans is only *useful* via `rushCoversAttack` or future cards that also ready/re-enter. Keep the strict reading (delete the `enteredRound` override line and assert `exhausted === true` in that test — make the test's name say the trap still exists for veterans). Flag it in the session notes as a designer question if playtests complain.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- rush`
Expected: FAIL — move still exhausts rush units / attack path may reject.

- [ ] **Step 3: Implement**

`engine.ts` `moveUnit`, replacing the exhaust line:

```ts
const rushFree = state.units[unitId].enteredRound === state.round && hasKw(state, unit, 'rush')
if (state.rules.moveExhausts && !rushFree) unit.exhausted = true
```

And in the attack path (Task 1's adapted single-attack; Task 4 keeps it): the exhaust-waiver for attack exists only behind `rushCoversAttack`:

```ts
const rushFreeAtk = state.rules.rushCoversAttack && u.enteredRound === state.round && hasKw(state, u, 'rush')
if (!rushFreeAtk) u.exhausted = true
```

`view.ts` `unitView`: delete `sick`, add:

```ts
rushFreeMove: u.enteredRound === state.round && hasKw(state, u, 'rush') && !u.exhausted,
```

(and remove `sick` from `UnitView` in types — done in Task 1's types edit if not already).

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A packages/engine
git commit -m "feat(engine): units enter ready; Rush waives the entry-round move exhaust (decision 41)"
```

---

### Task 3: Multi-unit attack + intercept window (decision 42)

The heart of the rework. Single attacks become the N=1 case of one code path.

**Files:**
- Modify: `packages/engine/src/engine.ts` (replace `attack()` with `attackDeclare` + `applyInterceptPhase` + `resolveAttack`; delete `guardsFor` forced targeting)
- Modify: `packages/engine/src/legal.ts` (attack enumeration, intercept phase, guard filter removal)
- Test: rewrite `packages/engine/test/combat.test.ts`, new `packages/engine/test/intercept.test.ts`

**Interfaces:**
- Consumes: Task 1 (`pendingAttack`, phase `'intercept'`, `advanceWindow`), Task 2 (attack exhaust rule).
- Produces: `attackDeclare(state, action: Extract<GameAction,{type:'attack'}>, seat)`, `applyInterceptPhase(state, action, seat)`, `resolveAttack(state, interceptorId: string | null)`. Legal actions in phase `'intercept'`: `{type:'intercept', unit}` per candidate + `{type:'declineIntercept'}`. AI (Task 5) and UIs (Tasks 7–8) build on these exact shapes.

- [ ] **Step 1: Write the failing tests**

`packages/engine/test/intercept.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { game, put, toLoop } from './util.ts'
import type { Seat } from '../src/types.ts'

/** Board: attacker seat A has `slugs` in zone 1; defender seat B has `defSlugs` in zone 1. */
function duel(slugs: string[], defSlugs: string[]) {
  let s = toLoop(game())
  const a = s.actorSeat, b = (1 - a) as Seat
  const atk = slugs.map(slug => put(s, a, slug, 1, { enteredRound: 0 }))
  const def = defSlugs.map(slug => put(s, b, slug, 1, { enteredRound: 0 }))
  return { s, a, b, atk, def }
}

describe('multi-unit attack + intercept (decision 42)', () => {
  it('combined power hits as one hit; armor applies once', () => {
    // two soldiers (2+2) vs plated (armor 2, health 3): 4-2=2 damage — not 2×(2-2)=0
    let { s, a, b, atk, def } = duel(['soldier', 'soldier'], ['plated'])
    s = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a).state
    expect(s.phase).toBe('loop') // no other ready defender → no intercept window
    expect(s.units[def[0]].damage).toBe(2)
  })

  it('counter-damage goes to the highest-power attacker only', () => {
    let { s, a, b, atk, def } = duel(['pawn', 'brute'], ['soldier']) // brute p4 eats the counter
    s = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a).state
    expect(s.units[atk[0]]?.damage ?? 99).toBe(0)   // pawn untouched (or dead-check guard)
    // brute took soldier's 2 power... but soldier (h2) died to 5 combined — simultaneous: counter still lands
    expect(s.units[atk[1]].damage).toBe(2)
  })

  it('defender may intercept with a ready unit in the zone; interceptor exhausts', () => {
    let { s, a, b, atk, def } = duel(['brute'], ['pawn', 'soldier'])
    s = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a).state
    expect(s.phase).toBe('intercept')
    expect(s.actorSeat).toBe(b)
    const legal = getLegalActions(s, b)
    expect(legal).toContainEqual({ type: 'intercept', unit: def[1] })
    expect(legal).toContainEqual({ type: 'declineIntercept' })
    s = applyAction(s, { type: 'intercept', unit: def[1] }, b).state
    expect(s.units[def[0]].damage).toBe(0)          // pawn untouched
    expect(s.units[def[1]]?.exhausted ?? true).toBe(true) // soldier stepped in and exhausted (or died)
    expect(s.phase).toBe('loop')
    expect(s.actorSeat).toBe(b)                     // alternation resumes from the attacker
  })

  it('Guard intercepts without exhausting', () => {
    let { s, a, b, atk, def } = duel(['pawn'], ['pawn', 'guardian'])
    s = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a).state
    s = applyAction(s, { type: 'intercept', unit: def[1] }, b).state
    expect(s.units[def[1]].exhausted).toBe(false)
  })

  it('Guard no longer forces targeting — attacking past a guard is legal', () => {
    let { s, a, b, atk, def } = duel(['soldier'], ['pawn', 'guardian'])
    const legal = getLegalActions(s, a)
    expect(legal.some(x => x.type === 'attack' && x.target.kind === 'unit' && x.target.id === def[0])).toBe(true)
  })

  it('base attacks can be intercepted', () => {
    let s = toLoop(game())
    const a = s.actorSeat, b = (1 - a) as Seat
    const enemyHome = (b === 0 ? 0 : 2) as 0 | 2
    const atk = put(s, a, 'brute', enemyHome, { enteredRound: 0 })
    const wall = put(s, b, 'guardian', enemyHome, { enteredRound: 0 })
    s = applyAction(s, { type: 'attack', attackers: [atk], target: { kind: 'base', seat: b } }, a).state
    expect(s.phase).toBe('intercept')
    const life = s.sides[b].life
    s = applyAction(s, { type: 'intercept', unit: wall }, b).state
    expect(s.sides[b].life).toBe(life)              // base never took the hit
    expect(s.units[wall].damage).toBe(4)
  })

  it('no ready defender → attack resolves immediately (auto-passed window)', () => {
    let { s, a, b, atk, def } = duel(['soldier'], ['pawn'])
    s.units[def[0]] // the target itself is not an interceptor candidate
    const r = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a)
    expect(r.state.phase).toBe('loop')
  })

  it('declineIntercept resolves against the declared target', () => {
    let { s, a, b, atk, def } = duel(['soldier'], ['pawn', 'soldier'])
    s = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a).state
    s = applyAction(s, { type: 'declineIntercept' }, b).state
    expect(s.units[def[0]]).toBeUndefined() // pawn (1h) died to 2 power
  })

  it('breakthrough caps at the SUM of attacker values, on the final target', () => {
    // crusher (p3, bt2) + soldier (p2) vs pawn (h1): 5 dealt, 4 excess, capped at 2
    let { s, a, b, atk, def } = duel(['crusher', 'soldier'], ['pawn'])
    const life = s.sides[b].life
    s = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a).state
    expect(s.sides[b].life).toBe(life - 2)
  })

  it('per-unit overextend adds power now and bills at end of round', () => {
    let { s, a, b, atk, def } = duel(['loner', 'pawn'], ['brute']) // loner p2 OE3 + pawn p1 = 6 vs brute h3
    s = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] }, overextend: [atk[0]] }, a).state
    expect(s.units[def[0]]).toBeUndefined()
    expect(s.units[atk[0]].overextendedBy).toBe(3)
  })

  it('attackers must share a zone; ranged-only groups may shoot an adjacent zone', () => {
    let s = toLoop(game())
    const a = s.actorSeat, b = (1 - a) as Seat
    const near = put(s, a, 'soldier', 1, { enteredRound: 0 })
    const far = put(s, a, 'soldier', (a === 0 ? 0 : 2), { enteredRound: 0 })
    const tgt = put(s, b, 'brute', 1, { enteredRound: 0 })
    expect(() => applyAction(s, { type: 'attack', attackers: [near, far], target: { kind: 'unit', id: tgt } }, a))
      .toThrow()
    const archers = [put(s, a, 'archer', (a === 0 ? 0 : 2), { enteredRound: 0 }),
                     put(s, a, 'archer', (a === 0 ? 0 : 2), { enteredRound: 0 })]
    const r = applyAction(s, { type: 'attack', attackers: archers, target: { kind: 'unit', id: tgt } }, a)
    expect(r.state.units[tgt].damage).toBe(4)      // 2+2, no armor
    expect(r.state.units[archers[0]].damage).toBe(0) // cross-zone ranged: no counter
  })

  it('onDefend fires for the interceptor, not the spared target', () => {
    // guardian carries yellow-style onDefend in the toy set? Extend T: give guardian onDefend influence +1
    let { s, a, b, atk, def } = duel(['pawn'], ['pawn', 'guardian'])
    const before = s.influence
    s = applyAction(s, { type: 'attack', attackers: atk, target: { kind: 'unit', id: def[0] } }, a).state
    s = applyAction(s, { type: 'intercept', unit: def[1] }, b).state
    const gained = Math.abs(s.influence - before)
    expect(gained).toBe(1)
  })
})
```

Also update `test/util.ts`'s toy `guardian` to carry the trigger the last test needs:

```ts
guardian: u('guardian', 2, 1, 3, { kw: [{ k: 'guard' }], onDefend: [{ op: 'influence', n: 1 }] }),
```

Rewrite `combat.test.ts` assertions in place: every `{ type: 'attack', attacker: id, ... }` becomes `attackers: [id]`; delete the "guard forces targeting" tests (superseded — the intercept suite covers protection); keep armor/ranged/reach/breakthrough single-attacker behaviors (they are the N=1 case and must not regress).

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- intercept combat`
Expected: FAIL — `attackers` shape and intercept phase don't exist.

- [ ] **Step 3: Implement**

`engine.ts` — replace the whole combat section:

```ts
function interceptCandidates(state: GameState, pa: NonNullable<GameState['pendingAttack']>): UnitInstance[] {
  const defender = other(pa.seat)
  const zone = pa.target.kind === 'unit'
    ? state.units[pa.target.id]?.zone
    : homeZone((pa.target as Extract<TargetRef, { kind: 'base' }>).seat)
  if (zone === undefined) return []
  return unitsInZone(state, zone, defender).filter(u =>
    !u.imprisoned && !u.exhausted && !(pa.target.kind === 'unit' && u.id === pa.target.id))
}

function attackDeclare(state: GameState, action: Extract<GameAction, { type: 'attack' }>, seat: Seat) {
  const ids = action.attackers
  if (!ids.length) fail('bad-attack', 'declare at least one attacker')
  if (new Set(ids).size !== ids.length) fail('bad-attack', 'attackers must be distinct')
  if (state.rules.maxAttackers > 0 && ids.length > state.rules.maxAttackers)
    fail('bad-attack', `at most ${state.rules.maxAttackers} attackers`)
  const units = ids.map(id => state.units[id] ?? fail('no-unit', 'no such attacker'))
  for (const u of units) {
    if (u.owner !== seat) fail('not-yours', 'not your unit')
    if (u.imprisoned) fail('imprisoned', 'imprisoned units cannot attack')
    if (u.exhausted) fail('exhausted', 'exhausted units cannot attack')
    if (isSick(state, u)) fail('sick', 'this unit just arrived this round')
    if (hasKw(state, u, 'cantAttack')) fail('cant-attack', 'this unit cannot attack')
  }
  const zone = units[0].zone
  if (units.some(u => u.zone !== zone)) fail('bad-attack', 'attackers must share a zone')

  const oeIds = action.overextend ?? []
  for (const id of oeIds) {
    if (!ids.includes(id)) fail('bad-attack', 'overextend lists a non-attacker')
    const u = state.units[id]
    if (typeof kwOf(state, u, 'overextend') !== 'number') fail('cant-overextend', `${defOf(state, id).name} has no Overextend value`)
  }

  const allRangedOrReach = units.every(u => hasKw(state, u, 'ranged') || hasKw(state, u, 'reach'))
  if (action.target.kind === 'base') {
    if (action.target.seat === seat) fail('bad-target', 'cannot attack your own base')
    if (units.some(u => hasKw(state, u, 'ranged'))) fail('bad-target', 'ranged units cannot target bases')
    if (zone !== homeZone(action.target.seat)) fail('bad-target', "you must stand in the enemy's home zone to strike their base")
  } else if (action.target.kind === 'unit') {
    const defender = state.units[action.target.id] ?? fail('no-unit', 'no such defender')
    if (defender.owner === seat) fail('bad-target', 'cannot attack your own unit')
    const sameZone = defender.zone === zone
    if (!sameZone && !(allRangedOrReach && adjacent(defender.zone, zone)))
      fail('bad-zone', allRangedOrReach ? 'target is out of range' : 'combat happens within one zone')
  } else fail('bad-target', 'attack a unit or a base')

  // commit: overextend bonuses, exhaust, declaration triggers
  for (const id of oeIds) {
    const u = state.units[id]
    const oe = kwOf(state, u, 'overextend') as number
    u.overextendedBy += oe
    log(state, seat, `${defOf(state, id).name} overextends (+${oe} power — it will suffer ${oe} at end of round)`)
  }
  for (const u of units) {
    const rushFreeAtk = state.rules.rushCoversAttack && u.enteredRound === state.round && hasKw(state, u, 'rush')
    if (!rushFreeAtk) u.exhausted = true
  }
  const targetName = action.target.kind === 'base'
    ? `${state.sides[action.target.seat].name}'s base`
    : defOf(state, action.target.id).name
  log(state, seat, `${ids.map(id => defOf(state, id).name).join(', ')} attack${ids.length === 1 ? 's' : ''} ${targetName}`)
  for (const u of units) {
    if (!state.units[u.id]) continue
    fireTrigger({ state, attackTarget: action.target, actorSeat: seat }, u, 'onAttack')
  }

  state.pendingAttack = { seat, attackers: ids.filter(id => state.units[id]), target: action.target, overextend: oeIds }
  if (interceptCandidates(state, state.pendingAttack).length) {
    state.phase = 'intercept'
    state.actorSeat = other(seat)
    log(state, other(seat), `${state.sides[other(seat)].name} may intercept`)
    return
  }
  resolveAttack(state, null)
}

function applyInterceptPhase(state: GameState, action: GameAction, seat: Seat) {
  const pa = state.pendingAttack ?? fail('bad-phase', 'no attack to answer')
  if (seat !== other(pa.seat)) fail('not-your-window', 'not your intercept window')
  if (action.type === 'intercept') {
    const u = state.units[action.unit] ?? fail('no-unit', 'no such unit')
    if (!interceptCandidates(state, pa).some(c => c.id === u.id)) fail('bad-intercept', 'that unit cannot intercept this attack')
    if (state.rules.interceptExhausts && !hasKw(state, u, 'guard')) u.exhausted = true
    log(state, seat, `${defOf(state, u.id).name} intercepts${hasKw(state, u, 'guard') ? ' (guard — stays ready)' : ''}`)
    resolveAttack(state, u.id)
  } else if (action.type === 'declineIntercept') {
    resolveAttack(state, null)
  } else fail('bad-phase', 'intercept or decline')
}

/** Resolve the pending attack against the final target (spec §1.7.3–4). */
function resolveAttack(state: GameState, interceptorId: string | null) {
  const pa = state.pendingAttack!
  state.pendingAttack = null
  state.phase = 'loop'
  const seat = pa.seat
  const attackers = pa.attackers.map(id => state.units[id]).filter(Boolean) as UnitInstance[]
  const finalRef: TargetRef = interceptorId ? { kind: 'unit', id: interceptorId } : pa.target

  const power = (u: UnitInstance) => {
    let p = effPower(state, u)
    if (pa.overextend.includes(u.id)) {
      const oe = kwOf(state, u, 'overextend')
      if (typeof oe === 'number') p += oe
    }
    return p
  }

  if (attackers.length && finalRef.kind === 'unit' && state.units[finalRef.id]) {
    const defender = state.units[finalRef.id]
    fireTrigger({ state, attackTarget: { kind: 'unit', id: attackers[0].id }, actorSeat: seat }, defender, 'onDefend')
  }

  const alive = attackers.filter(u => state.units[u.id])
  const combined = alive.reduce((s2, u) => s2 + power(u), 0)

  if (finalRef.kind === 'base') {
    if (alive.length) {
      damageBase(state, finalRef.seat, combined, alive.map(u => defOf(state, u.id).name).join(', '))
      for (const u of alive) if (state.units[u.id]) fireTrigger({ state, attackTarget: finalRef, actorSeat: seat }, u, 'onAttackBase')
    }
  } else if (state.units[finalRef.id]) {
    const defender = state.units[finalRef.id]
    const dealt = Math.max(0, combined - effArmor(state, defender)) // armor once (armorPerAttack: 'once')
    const defPower = defender.imprisoned ? 0 : effPower(state, defender)
    const counterTarget = alive.slice().sort((a, b) => power(b) - power(a) || idNum(a.id) - idNum(b.id))[0]
    const crossZone = counterTarget && defender.zone !== counterTarget.zone
    const noCounter = !counterTarget || (crossZone && hasKw(state, counterTarget, 'ranged'))
    const taken = noCounter ? 0 : Math.max(0, defPower - effArmor(state, counterTarget))
    const defRemaining = Math.max(0, effHealth(state, defender) - defender.damage)
    defender.damage += dealt
    if (taken > 0) counterTarget.damage += taken
    log(state, seat, taken > 0
      ? `the assault deals ${dealt}; ${defOf(state, defender.id).name} strikes ${defOf(state, counterTarget.id).name} back for ${taken}`
      : `the assault deals ${dealt} to ${defOf(state, defender.id).name}`)

    const btSum = alive.reduce((s2, u) => {
      const bt = kwOf(state, u, 'breakthrough')
      return s2 + (typeof bt === 'number' ? bt : 0)
    }, 0)
    if (btSum > 0 && dealt > defRemaining) {
      const excess = Math.min(btSum, dealt - defRemaining)
      if (excess > 0) damageBase(state, defender.owner, excess, 'breakthrough')
    }

    const died = defender.damage >= Math.max(0, effHealth(state, defender))
    if (died) for (const u of alive) if (state.units[u.id]) fireTrigger({ state, attackTarget: finalRef, actorSeat: seat }, u, 'onKill')
  }

  stateBasedCleanup(state, seat)
  if (state.winner !== null) return
  advanceWindow(state, seat)
}
```

Wire `applyInterceptPhase` into `applyAction`'s dispatch (replacing Task 1's stub). In `applyLoopPhase`'s attack case (Task 1 already returns early on `phase === 'intercept'`), also **don't** call `advanceWindow` on the immediate-resolve path — `resolveAttack` did it. Restructure: the `attack` case becomes `case 'attack': attackDeclare(state, action, seat); return` (declare→resolve handles all window advancement).

`legal.ts` — replace the attack block and add the intercept phase:

```ts
if (state.phase === 'intercept') {
  const pa = state.pendingAttack
  if (!pa || seat !== other(pa.seat)) return []
  const out2: GameAction[] = [{ type: 'declineIntercept' }]
  for (const u of interceptCandidates(state, pa)) out2.push({ type: 'intercept', unit: u.id })
  return out2
}
```

(Export `interceptCandidates` from `engine.ts` — legal.ts and ai.ts both need it.)

Attack enumeration in the loop phase (no guard filter, both seats, singles + one full-group per zone/target):

```ts
const mine = unitsOf(state, seat).filter(u => !u.exhausted && !u.imprisoned && !isSick(state, u) && !hasKw(state, u, 'cantAttack'))
const byZone = new Map<ZoneId, UnitInstance[]>()
for (const u of mine) byZone.set(u.zone, [...(byZone.get(u.zone) ?? []), u])
for (const [zone, group] of byZone) {
  const targetsHere = new Map<string, TargetRef>()
  for (const u of group) for (const t of attackTargets(state, u)) targetsHere.set(JSON.stringify(t), t)
  for (const t of targetsHere.values()) {
    const able = group.filter(u => attackTargets(state, u).some(x => JSON.stringify(x) === JSON.stringify(t)))
    for (const u of able) {
      out.push({ type: 'attack', attackers: [u.id], target: t })
      if (typeof kwOf(state, u, 'overextend') === 'number')
        out.push({ type: 'attack', attackers: [u.id], target: t, overextend: [u.id] })
    }
    if (able.length > 1) {
      const ids = able.map(u => u.id)
      out.push({ type: 'attack', attackers: ids, target: t })
      const oe = able.filter(u => typeof kwOf(state, u, 'overextend') === 'number').map(u => u.id)
      if (oe.length) out.push({ type: 'attack', attackers: ids, target: t, overextend: oe })
    }
  }
}
```

`attackTargets(state, unit)` itself: delete the guard-forcing filter (`eligible = guards.length ? guards : defenders` → `eligible = defenders`) and the base-attack guard check (base is attackable whenever standing in the enemy home; protection now = intercept). Ranged/reach zone logic unchanged. **Note:** the group action is legal only if every member could legally take `t` alone — cross-zone groups therefore require all-ranged/reach via each unit's own `attackTargets`, matching `attackDeclare`.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS. The simulation test (`simulate.test.ts`) is the canary — it applies thousands of legal actions and will surface any declare/legal mismatch as an engine throw.

- [ ] **Step 5: Commit**

```bash
git add -A packages/engine
git commit -m "feat(engine): multi-unit attacks with defender intercept window (decision 42)"
```

---

### Task 4: Card data migration — Final Onslaught, CSV triggers, importer

**Files:**
- Modify: `packages/engine/src/cards/red.ts` (final-onslaught)
- Modify: `data/cards.csv` (mechanical token migration + final-onslaught row)
- Modify: `scripts/cards-import.ts` (trigger key + `influenceTrigger` values `startOfTurn`→`startOfRound`)
- Test: `packages/engine/test/cards.test.ts` (already validates all defs — extend with a Final Onslaught behavior test in `effects.test.ts`)

**Interfaces:**
- Consumes: Task 1's `extraAction` op + `ready`-with-target op shape; Task 3 (suite green).
- Produces: card set clean of v1 tokens; `npx tsx scripts/cards-import.ts` exits 0.

- [ ] **Step 1: Write the failing test**

Append to `packages/engine/test/effects.test.ts`:

```ts
it('Final Onslaught: ready one unit, then take an extra action (decision 43)', () => {
  let s = toLoop(game())
  const a = s.actorSeat
  fuel(s, a, 8)
  const vet = put(s, a, 'brute', 1, { exhausted: true, enteredRound: 0 })
  const card = toHand(s, a, 'onslaught') // add to toy set below
  s = applyAction(s, { type: 'play', card, targets: [{ kind: 'unit', id: vet }] }, a).state
  expect(s.units[vet].exhausted).toBe(false)
  expect(s.actorSeat).toBe(a) // extra action: window stays
})
```

Add to `test/util.ts` toy set:

```ts
onslaught: { slug: 'onslaught', name: 'onslaught', color: 'red', type: 'action', cost: 8, text: '',
  targets: [{ t: 'unit', side: 'friendly' }],
  onPlay: [{ op: 'ready', side: 'friendly', t: 'chosen0' }, { op: 'extraAction' }] },
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- effects`
Expected: FAIL — `ready` ignores `t` (readies everything) and/or validation rejects.

- [ ] **Step 3: Implement**

`effects.ts` `ready` case:

```ts
case 'ready': {
  if (op.t) {
    const u = resolveUnitTarget(ctx, op.t)
    if (u && u.owner === controller) { u.exhausted = false; log(state, u.owner, `${name(state, u.id)} readies`) }
    break
  }
  for (const u of unitsOf(state, controller)) u.exhausted = false
  log(state, controller, `${state.sides[controller].name}'s units ready for another assault`)
  break
}
```

`validate.ts`: allow optional `t: 'chosen0'` on `ready`.

`cards/red.ts` final-onslaught (line ~200):

```ts
targets: [{ t: 'unit', side: 'friendly' }],
onPlay: [{ op: 'ready', side: 'friendly', t: 'chosen0' }, { op: 'extraAction' }],
```

(The card is unplayable with zero friendly units — acceptable: an "onslaught" with no army is dead weight by design; note it in the card's `designerNote`.)

`data/cards.csv` migration (run from repo root; macOS sed):

```bash
sed -i '' 's/""startOfTurn""/""startOfRound""/g; s/""dur"":""turn""/""dur"":""round""/g' data/cards.csv
sed -i '' 's/,startOfTurn,/,startOfRound,/g' data/cards.csv   # influenceTrigger column values
```

Then hand-edit the `final-onslaught` row: text → `Ready one of your units, then immediately take an extra action. Overextend 5.`, effectsJson → `{"targets":[{"t":"unit","side":"friendly"}],"onPlay":[{"op":"ready","side":"friendly","t":"chosen0"},{"op":"extraAction"}]}` (match the importer's actual effectsJson envelope — read `scripts/cards-import.ts:83` first; if targets live outside effectsJson, put them where the importer expects).

`scripts/cards-import.ts:51`: `startOfTurn` → `startOfRound` (both the property read and the emitted trigger tag).

- [ ] **Step 4: Validate everything**

Run: `npm test && npx tsx scripts/cards-import.ts`
Expected: PASS, importer exits 0 with no validation errors. `grep -rn "startOfTurn\|extraTurn\|\"dur\":\"turn\"" packages/engine/src data scripts` → empty.

- [ ] **Step 5: Commit**

```bash
git add -A packages/engine data scripts/cards-import.ts
git commit -m "feat(cards): migrate card data to v2 vocabulary; Final Onslaught = ready-one + extra action (decision 43)"
```

---

### Task 5: AI — claim timing, intercept policy, multi-unit attack scoring

**Files:**
- Modify: `packages/engine/src/ai.ts`
- Test: `packages/engine/test/ai.test.ts` (extend)

**Interfaces:**
- Consumes: Task 3's action shapes and `interceptCandidates` export.
- Produces: `heuristicPolicy`/`randomPolicy` handle every new action type; simulations complete.

- [ ] **Step 1: Write the failing tests**

Append to `packages/engine/test/ai.test.ts`:

```ts
it('heuristic answers an intercept window without throwing, and saves a valuable target', () => {
  let s = toLoop(game())
  const a = s.actorSeat, b = (1 - a) as Seat
  const atk = put(s, a, 'brute', 1, { enteredRound: 0 })      // p4
  const jewel = put(s, b, 'soldier', 1, { enteredRound: 0 })  // the declared target (dies to 4)
  const wall = put(s, b, 'guardian', 1, { enteredRound: 0 })  // free interceptor
  s = applyAction(s, { type: 'attack', attackers: [atk], target: { kind: 'unit', id: jewel } }, a).state
  expect(s.phase).toBe('intercept')
  const [action] = heuristicPolicy(s, b, policyRngInit(1))
  expect(action.type).toBe('intercept') // guard intercept is free — obviously right here
})

it('heuristic scores multi-unit attacks (prefers the lethal group over a chip single)', () => {
  let s = toLoop(game())
  const a = s.actorSeat, b = (1 - a) as Seat
  put(s, a, 'soldier', 1, { enteredRound: 0 })
  put(s, a, 'soldier', 1, { enteredRound: 0 })
  put(s, b, 'brute', 1, { enteredRound: 0 }) // h3: dies only to the 4-power group
  const [action] = heuristicPolicy(s, a, policyRngInit(1))
  expect(action.type).toBe('attack')
  if (action.type === 'attack') expect(action.attackers.length).toBe(2)
})

it('random policy completes games under the new rules (smoke)', () => {
  const r = simulate({ seed: 77, policyA: 'random', policyB: 'random' })
  expect(r.winner === 0 || r.winner === 1).toBe(true)
})
```

(Import `simulate` per the existing `simulate.test.ts` pattern; reuse its helper if one exists.)

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- ai`
Expected: FAIL — policies don't score `intercept`/`claimInitiative`/multi-`attackers`.

- [ ] **Step 3: Implement**

`ai.ts` changes:

1. `attackScore` reworked for groups (rename param): combined power = Σ `effPower` (+OE for listed ids); counter lands on the highest-power member — reuse the existing kill/trade math with `atkValue` = that member's value, and add `+ 2 * (attackers.length - 1)` when the group kill converts (rewards focus-fire), `- 3 * (attackers.length - 1)` when it doesn't (don't over-commit into a wall).
2. New `interceptScore(state, seat, action)`: for `declineIntercept` return 10. For `intercept`: simulate roughly — combined incoming `dealt`, interceptor dies? declared target would die? guard (free) or not:
   `score = (targetDies ? targetValue * 3 : 0) - (interceptorDies ? interceptorValue * 3 : 0) - (guard ? 0 : 6) + 12`.
3. `claimInitiative` score: `4 + (nothing-better bonus)`: compute `const meaningful = legal.some(a => a.type === 'attack' || a.type === 'play')`; score `meaningful ? 2 : 8`. (Claiming beats passing when the hand is spent; initiative is worth a real action when contested.)
4. `case 'resource'` branch: unchanged logic, now reachable in phase `'bank'`.
5. Every `switch` gains `case 'intercept'`/`case 'declineIntercept'`/`case 'claimInitiative'`.

- [ ] **Step 4: Run the full suite + a real sim batch**

Run: `npm test && npx tsx -e "import('./packages/engine/src/simulate.ts').then(async m => console.log(JSON.stringify(await m.runBatch?.({games:60,seedStart:1,a:'heuristic',b:'heuristic'}) ?? 'adapt to simulate.ts API')))"`
(Adapt the one-liner to `simulate.ts`'s actual exported API — read the file; the demo Simulator and `simulate.test.ts` show usage.)
Expected: tests PASS; 60/60 games terminate with winners; note the red/yellow/influence split in the task log for the wrap-up comparison.

- [ ] **Step 5: Commit**

```bash
git add -A packages/engine
git commit -m "feat(ai): claim-initiative timing, intercept policy, multi-unit attack scoring"
```

---

### Task 6: Views, simulator, and the engine's public surface

**Files:**
- Modify: `packages/engine/src/view.ts`, `packages/engine/src/simulate.ts`, `packages/engine/src/index.ts`
- Modify: `docs/SPECS/api-endpoints.md` — already updated (v2.0 `PlayerView` line); verify only
- Test: extend `packages/engine/test/simulate.test.ts` (SimResult.rounds), quick view assertions in `round.test.ts`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces (consumed by both UIs and the server): `PlayerView` v2 exactly as follows —

```ts
export interface PlayerView {
  viewerSeat: Seat | null
  round: number
  phase: 'setup' | 'bank' | 'loop' | 'intercept'
  initiative: Seat
  actorSeat: Seat
  outOfRound: [boolean, boolean]
  claimedThisRound: boolean
  pendingAttack: { attackers: string[]; target: TargetRef } | null
  influence: number
  thresholds: [number, number]
  sides: [SideView, SideView]
  zones: { units: UnitView[] }[]
  hand: HandCardView[]
  actions: GameAction[]
  winner: Seat | null
  winReason: string | null
  log: LogLine[]
}
```

`SimResult.turns` → `rounds`.

- [ ] **Step 1: Write the failing assertions** — in `round.test.ts` add:

```ts
it('viewFor exposes the round state the UIs need', () => {
  const s = toLoop(game())
  const v = viewFor(s, s.actorSeat)
  expect(v.round).toBe(1)
  expect(v.phase).toBe('loop')
  expect(v.initiative).toBe(s.initiative)
  expect(v.outOfRound).toEqual([false, false])
  expect(v.pendingAttack).toBe(null)
})
```

- [ ] **Step 2: Run to verify failure**: `npm test -- round` → FAIL (fields missing).

- [ ] **Step 3: Implement** — `view.ts` `viewFor` returns the new fields (`pendingAttack: state.pendingAttack ? { attackers: state.pendingAttack.attackers, target: state.pendingAttack.target } : null`); `simulate.ts` reports `rounds: state.round`. Check `index.ts` exports compile.

- [ ] **Step 4: Run**: `npm test` → PASS.

- [ ] **Step 5: Commit**: `git add -A packages/engine docs/SPECS && git commit -m "feat(engine): v2 PlayerView (round/initiative/intercept) and SimResult.rounds"`

---

### Task 7: Demo UI (`apps/demo`) — the designer's playtest surface

**Read first:** `apps/demo/src/DemoTable.tsx` end to end (696 lines) before editing — it has a selection state machine (`selection`, `isHighlighted`, `refClicked`, `beginPlay`) and per-phase click handling that these changes extend, not replace. Mirror its idioms.

**Files:**
- Modify: `apps/demo/src/DemoTable.tsx`
- Modify: `apps/demo/src/pages/Play.tsx` (labels only, if it names turns/phases)
- Verify with: `npm run dev` in `apps/demo` + the repo's `/verify` browser-drive scripts (Task 9 updates them)

**Interfaces:**
- Consumes: Task 6's `PlayerView` exactly.
- Produces: a playable hotseat/AI game under v2 rules.

Behavioral contract (each bullet = acceptance criterion):

1. **HUD**: header shows `Round N` and an initiative badge (⚑ + player name) instead of turn/phase; when `view.outOfRound[seat]` is true, that player's panel shows "claimed initiative — done this round".
2. **Bank phase**: when `phase === 'bank'` and it's your window, the hand prompts "bank a card or skip" (the old resource-phase affordances relocate; `view.actions` already contains exactly `resource`/`skipResource` — key the UI off the actions list, not the phase name, wherever possible).
3. **Claim initiative button**: visible in the action dock during `phase === 'loop'` when `{type:'claimInitiative'}` is in `view.actions`; confirm dialog not needed (it's just an action); log line renders from the event stream as usual.
4. **Multi-select attack**: clicking a ready friendly unit starts an attack selection (as today); clicking **additional ready friendly units in the same zone** adds them to the group (selected units get the existing highlight ring); clicking a legal target fires `{ type: 'attack', attackers: [...], target }`. The legal-target highlighting derives from `view.actions` entries whose `attackers` are a superset-compatible match — simplest correct rule: a target is highlighted if some legal attack action with `attackers ⊇ current selection` has that target. Overextend: keep the existing per-attack OE toggle; it now applies to every selected unit that has the keyword (build `overextend: selectedIdsWithOEKeyword` when toggled).
5. **Intercept prompt**: when `phase === 'intercept'` and it's your window, a modal-ish banner (reuse the setup-phase banner pattern) says "*{attacker names}* attack *{target}* — intercept?"; eligible interceptors (from `view.actions`) get the highlight ring; clicking one sends `intercept`; a "Let it through" button sends `declineIntercept`. In AI mode the policy answers automatically (it already will — the AI drive loop feeds `heuristicPolicy` whatever window opens, including intercepts, after Task 5).
6. **Auto-pass rework**: the old `offTurn`/`skipToMyTurn` logic keyed on `state.activeSeat` dies. Replace with: auto-pass **nothing** by default; the "skip to my window" convenience button remains meaningful only while `outOfRound[mySeat] === false` and only auto-answers windows where the sole legal action is `pass` (same spirit as before: response windows auto-pass, real decisions never do). `intercept` windows are real decisions — never auto-answered for a human seat.
7. **Rush hint**: units with `rushFreeMove` show the existing keyword chip treatment with "free move" (exact styling: match the `sick` chip it replaces).
8. **Game file export**: `result.turns` → `result.rounds`; filename `-turn${...}` → `-round${...}`.

- [ ] **Step 1: Update `DemoTable.tsx` per the contract** (no snapshot tests exist for the demo; correctness is driven by Step 2).
- [ ] **Step 2: Manual drive**: `cd apps/demo && npm run dev` — play one full hotseat round exercising: bank, claim, multi-unit attack into an intercept, Final Onslaught. Then one vs-AI game to confirm the bot answers intercept windows.
- [ ] **Step 3: Commit**: `git add -A apps/demo && git commit -m "feat(demo): round HUD, claim button, multi-select attacks, intercept prompt"`

---

### Task 8: Web app (`apps/web`) + server check

**Files:**
- Modify: `apps/web/src/pages/GameTable.tsx`, `apps/web/src/game/Sheets.tsx` (same behavioral contract as Task 7 — these two files are the web mirror of DemoTable)
- Verify: `grep -rn "activeSeat\|phase\|\.turn\b" apps/server/src` — expected: no engine-state coupling (server is a pass-through reducer host); fix any stragglers found.

- [ ] **Step 1: Apply the Task 7 contract to the web UI** (read both files first; they share the demo's idioms).
- [ ] **Step 2: Run the web app's checks**: `npm test` at root (engine), then `npx tsc --noEmit -p apps/web` (or the workspace's typecheck script — check `apps/web/package.json`).
Expected: clean compile.
- [ ] **Step 3: Commit**: `git add -A apps/web apps/server && git commit -m "feat(web): v2 round/initiative/intercept UI"`

---

### Task 9: Browser-drive verification scripts + docs + final proof

**Files:**
- Modify: `scripts/verify-drive.ts`, `scripts/verify-demo.ts`, `scripts/verify-mobile.ts` (they script full games against the old phase flow — update the driven action sequences to v2; read each first)
- Modify: `docs/GAME-FLOW.md` — rewrite the turn/combat sections to the round/initiative/intercept story (designer-facing narrative, mirrors spec §1.4–1.7; keep its voice)
- Modify: `docs/PROMPTS/CURRENT-HANDOFF-PROMPT.md` — at wrap (session protocol owns this)

- [ ] **Step 1: Update the verify scripts** to drive a v2 game (two-bank-steps, loop actions, at least one intercept answer).
- [ ] **Step 2: Run everything**:

```bash
npm test                              # full engine suite
npx tsx scripts/cards-import.ts       # card data still valid
npx tsx scripts/verify-demo.ts        # browser drive (see repo /verify skill)
```

Expected: all green. Also run a 200-game heuristic-mirror sim batch and record the new red/yellow/life-influence split next to the pre-change numbers (handoff prompt has them: red ~30%, influence nearly extinct) — the designer needs the before/after.
- [ ] **Step 3: Rewrite `docs/GAME-FLOW.md`** sections: "Turn structure" → rounds/initiative/claim, attack section → decision 42, Rush row in the keyword table → decision 41 semantics, Guard row → "intercepts without exhausting".
- [ ] **Step 4: Final commit**:

```bash
git add -A
git commit -m "feat: turn-structure v2.0 complete — verify drives, GAME-FLOW, sim baselines"
```

---

## Self-review notes (already applied)

- Spec §1.4 bank-input point → phase `'bank'` with `startStep`; §1.5 claim-to-lock and solo-continuation → `outOfRound` + single-pass round end; §1.7 auto-pass on empty intercept → immediate `resolveAttack(null)`; §1.7 cross-zone counter exemption follows the v1.2 ranged precedent (spec is silent on ranged counters in groups — flagged in Task 3 code comment territory via the test).
- Deliberate scope cut: `counterAssignment:'defender'`, `armorPerAttack:'perAttacker'`, `endOfRound` card triggers (no card uses one) — types allow, engine implements only defaults. YAGNI per spec §2 "future" markers.
- Known behavior changes tests must not "fix" backward: both players draw every round (economy doubles vs v1 — expect sims to shift; that's real, report it), guard walls no longer block by decree (yellow's fortress plan weakens — the designed intent of decision 42).
