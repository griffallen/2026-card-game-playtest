# Build Plan — Prototype v0

> Executed 2026-07-07 in one autonomous session (builder authorized; see SESSION-SUMMARIES/001). Format per `docs/AGENT/build-plan.md`; discipline per superpowers writing-plans (exact files, locked interfaces, TDD cycle, commit per slice). Specs: `docs/SPECS/*`. Each slice is end-to-end runnable; a slice may be rejected without breaking earlier ones.

**Goal:** deployable two-human online prototype: accounts, deck selection, remote play, admin, Docker/fly.io+Neon ready.
**Stack (global constraints):** Node 24 LTS, TypeScript strict, npm workspaces; engine = pure TS (no I/O, seeded RNG only); Fastify + Prisma + PostgreSQL; React 18 + Vite + Tailwind v4; Vitest. Tests never touch the dev DB (`DATABASE_URL_TEST` must differ — hard abort).

## Slice map

| # | Slice | Proves itself by |
|---|---|---|
| 0 | Monorepo scaffold | `npm test` + `npm run build` run green in every workspace |
| 1 | Engine core: setup & determinism | tests: seeded shuffle reproducible; setup deals 7−2+2 per spec |
| 2 | Engine: turn flow + combat | tests: phase machine, alternation, attack math, keywords, win checks |
| 3 | Engine: effects + all 84 cards | tests per effect op + representative cards; card-set validator |
| 4 | Engine: legality + simulation | 150 random seeded games terminate, both win conditions reachable |
| 5 | Server: schema + auth + REST | Fastify inject tests vs test DB: register→login→create→join |
| 6 | Server: WS play | scripted two-socket game plays turns over the wire |
| 7 | Web: shell/lobby/decks/cards | vite build green; manual: login → lobby → create game |
| 8 | Web: game table | two browsers play a full game remotely |
| 9 | Admin | card numeric edit + deck edit + rules clone round-trip |
| 10 | Docker/fly/Neon | image builds; boots vs local PG; healthz green; deploy docs |

## Locked interfaces (what later slices import from earlier)

```ts
// packages/engine/src/index.ts exports —
createGame(opts: {seed: number; rules: RulesConfig; cardSet: CardSet;
                  players: [{name: string; deck: string[]}, {name: string; deck: string[]}]}): GameState
applyAction(state: GameState, action: GameAction, actorSeat: Seat): {state: GameState; events: LogLine[]}  // throws EngineError
getLegalActions(state: GameState, seat: Seat): GameAction[]
viewFor(state: GameState, seat: Seat | null, cardSet: CardSet): PlayerView
validateCardSet(cards: CardSet): string[]            // effect-schema errors, used by admin PATCH
validateDeck(slugs: string[], cardSet: CardSet, rules: RulesConfig): string[]
simulateRandomGame(seed: number, deckA: string[], deckB: string[], rules?: RulesConfig): SimResult
DEFAULT_RULES: RulesConfig
CARD_SET: CardSet                                     // canonical 84 defs (DB seed source)
PREBUILT_DECKS: {slug: string; name: string; color: string; cards: {slug: string; count: number}[]}[]

type Seat = 0 | 1
type ZoneId = 0 | 1 | 2                               // 0 = seat0 home, 1 = neutral, 2 = seat1 home
type GameAction =
  | {type:'resource'; card: string} | {type:'skipResource'}
  | {type:'play'; card: string; targets?: TargetRef[]; toZone?: ZoneId}
  | {type:'move'; unit: string; to: ZoneId}
  | {type:'attack'; attacker: string; target: TargetRef}
  | {type:'pass'} | {type:'concede'}
type TargetRef = {kind:'unit'; id: string} | {kind:'base'; seat: Seat} | {kind:'zone'; zone: ZoneId}
```

`PlayerView` per api-endpoints spec. Server persists `GameAction` verbatim as `GameEvent.action` — replay is `actions.reduce(applyAction, createGame(...))`.

## Slice details

**0 — Scaffold.** Files: root `package.json` (workspaces `packages/*`, `apps/*`; scripts `dev`, `test`, `build`, `db:*`), `tsconfig.base.json` (strict, ES2022, bundler resolution), workspace packages with vitest configs, Tailwind v4 via `@tailwindcss/vite`, `.env.example`, `.gitignore`, `docker-compose.dev.yml` (PG 16 on 5432 for machines without local PG — dev default is local Homebrew PG). Done: all three workspaces build; empty test files pass.

**1 — Engine core.** Files: `src/{types,rng,rules,setup}.ts`, `test/{rng,setup}.test.ts`. mulberry32; Fisher–Yates; `createGame` deals per game-rules §1.3 (hand 7 incl. auto-resourcing last 2 face-up), seeded first-player flip; instance ids `c0…cN` deterministic. Tests: same seed ⇒ identical state; different seed ⇒ different order; zone/pile card conservation.

**2 — Turn flow + combat.** Files: `src/engine.ts` (+`src/statics.ts`), `test/{flow,combat,keywords,win}.test.ts`. Phase machine (auto Reset/Draw/End), resource phase, main-phase alternation + double-pass, actions play(vanilla units)/move/attack/pass/concede, combat per §1.7 (armor, guard targeting, breakthrough cap, overextend-alone-in-zone, ranged, sickness/rush, imprisoned-defender), win checks §1.12 incl. simultaneity tiebreak, first-turn draw 1. Tests drive a scripted two-seat game through every rule cited by section number.

**3 — Effects + cards.** Files: `src/effects.ts` (op interpreter + triggers + conditions), `src/cards/{red,yellow,index}.ts`, `src/decks.ts`, `test/{effects,cards}.test.ts`. All ops from game-rules §3.2, triggers §3.3, statics §3.4 (auras, thresholdMod, imprisonWatcher), prison subsystem §1.11 (decay, release threshold, source-death release). 84 cards encoded; `validateCardSet(CARD_SET)` returns `[]` (test). Representative card tests: one per effect pattern (≈20) + every ⚑ reinterpreted card.

**4 — Legality + simulation.** Files: `src/{legal,view,simulate}.ts`, `test/{legal,simulate}.test.ts`. `getLegalActions` complete (drives sim + UI); state invariant validator; sim per simulation spec (150 seeds × 2 orderings, bounds, reachability assertions, stats table).

**5 — Server REST.** Files: `prisma/schema.prisma`, `prisma/seed.ts`, `src/{db,auth,app,index}.ts`, `src/routes/{auth,cards,decks,games,admin}.ts`, `test/api.test.ts`. Per api-endpoints spec. scrypt auth; session cookie; seed = admin user (`admin` / env `ADMIN_PASSWORD`, default printed), rules v1.2-proto, 84 cards, 2 prebuilt decks. Tests: full auth+game-creation flow via `app.inject()` on `DATABASE_URL_TEST` (abort if == dev).

**6 — Server WS.** Files: `src/{ws,gameStore}.ts`, `test/ws.test.ts`. Rooms, per-viewer views, action→persist→broadcast, undo (delete last event + replay), presence, reconnect-pushes-state. Test: real sockets vs listening server; scripted resource/play/pass/attack turns land in both clients' views; illegal action → error frame.

**7 — Web shell.** Files: `apps/web/src/*` (`main,App,api,auth,theme.css`), `pages/{Login,Register,Lobby,Decks,DeckDetail,Cards}.tsx`, `components/{CardFrame,ProceduralArt,DeckPicker}.tsx`. Theme per views spec. Procedural art: seeded SVG from slug hash (faction palette, type motif) when `artUrl` null.

**8 — Web table.** Files: `pages/GameTable.tsx`, `game/{Board,ZoneRow,UnitChip,HandBar,SidePanel,InfluenceTrack,LogPanel,useGameSocket}.ts(x)`. Click-to-act driven by `legalHints`; all board states (exhaust/imprison/sick/armor/damage); turn ribbon; game-over; concede/undo; spectator.

**9 — Admin.** Files: `pages/admin/{AdminLayout,Users,Games,Cards,Decks,Rules}.tsx`, server admin routes (slice 5 carries the API). Card editor validates `effects` through `validateCardSet` server-side.

**10 — Deploy.** Files: `Dockerfile` (multi-stage: install→build web+server→slim runtime; entrypoint runs `prisma migrate deploy` then boots), `fly.toml`, `docker-compose.prod-test.yml` (PG on 5433 + app image), `README-DEPLOY.md` (fly.io + Neon step-by-step incl. `DATABASE_URL`/`DIRECT_URL`, sslmode, secrets), root README quickstart. Done: local image boots against local PG; `/healthz` green; login + create game work through the container.

## Test/commit cadence
Red → green per unit within a slice; `git commit` at every slice boundary (message `slice N: …`). Engine slices are strict TDD; UI slices get build + interaction smoke via the running dev stack.

---

# v3.0 build plan (2026-07-11 — Blaine's build order, issue #12)

**Contract:** `docs/SPECS/game-rules-v3-draft.md` (all questions answered, decisions 59–70).
**Prime directive:** one engine, two rule sets — v3 lands behind rules parameters
(`combatModel`, `pipModel`, keyword availability), v2.3 configs keep playing unchanged.
Strict TDD per slice; commit per slice; deploy + release tag at the end.

**V3-1 — Version plumbing.** `RulesConfig` gains `combatModel: 'intercept'|'blockerPairing'`,
`pipModel: 'none'|'presence'`, `upgradeOrphanRule`, `scarCap`, `blockingExhausts` — v2.3
defaults preserve today's behavior; a `V3_RULES` preset flips them. Tests: both presets
normalize; v2.3 sims unchanged.
**V3-2 — Pips (presence model, decision 69).** `CardDef.pips?: Color[]`; bank exposes color
presence (1 per color per card, no stacking); `playCard` gates on presence ≥ per-color pip
count; pip data imported from `06-PIP-PROPOSAL.md` table into card files (`pips:` line).
Tests: presence counting, multi-color providers, 0-cost gate, no-stack, v2.3 ignores pips.
**V3-3 — Keyword suite.** Under v3 rules: overextend/flying/reach/untargetable/prison inert;
Scar (capped, decision 70), Shielded, Infiltrate, Hidden (targeting+attack filter), Sneak
(`activate` action, per-card payload ops), Capture (orphan-under, decline-ready, exhausted
return — decision 61). Tests per keyword incl. Hidden-blocks-and-reveals, capture round-trip.
**V3-4 — Combat (blocker-pairing).** Declare(group→one target) → block(pairing, gang) →
simultaneous resolve; defender splits gang damage; unblocked → declared target; breakthrough
spill to target; blocking exhausts (Guard exempt, decision 62); Home only from its zone.
Replaces intercept under v3. Tests: every §1.3 sentence + intercept tests still green on v2.3.
**V3-5 — Vocabulary extensions.** Modal (`modes:[]`, declared at cast), count-pump, linked
amounts, conditional bonus (`bonusIf`), `upTo`/`sameZone` target flags, `attachOrphan` action
(decision 67), `double` over UnitFilter, `dur:{rounds:N}`. Tests: one card-shaped test each.
**V3-6 — Card re-churn.** All 120 cards re-priced (superlinear, decision 68) against the #10
charter; staged queue folds in (PR #13 modal Reckless, Blood Rush, Devastating Strike,
Volcanic Slam, Unchained Rage); purple converts to Hidden/Sneak/Infiltrate identity; pips per
approved baseline. `npm run cards` green; sim harness matchup table regenerated; canon-v2.0.
**V3-7 — Demo + ship.** Rules-version toggle on Play setup (v3.0 default, v2.3 selectable);
pip presence UI (Griff's sigils from `art-themes/pips/`); blocker-assignment interaction;
new-keyword badges; UX audit pass (playable > pretty); `game-rules.md` swapped to v3.0 (v2.3
archived); deploy; **GitHub release tag with executive summary posted to #12**.
