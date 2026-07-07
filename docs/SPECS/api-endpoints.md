# API & WebSocket Spec

All REST under `/api`, JSON. Auth via `sid` cookie (see data-models §Session). Errors: `{error: string}` with 400/401/403/404/409. The server serves the built web app statically for all non-`/api` routes (single origin — no CORS anywhere).

## Auth
| Route | Body → Response |
|---|---|
| POST `/api/auth/register` | `{username, password}` → `{user}` + cookie. Open registration (private deployment). Password ≥ 8 chars. |
| POST `/api/auth/login` | `{username, password}` → `{user}` + cookie |
| POST `/api/auth/logout` | → `{ok:true}`, clears session |
| GET `/api/auth/me` | → `{user}` or 401. `user = {id, username, isAdmin}` |

## Cards / Decks (any logged-in user)
| Route | Response |
|---|---|
| GET `/api/cards` | active cards, full definitions (the card browser is a designer tool — nothing hidden) |
| GET `/api/decks` | prebuilt + own decks with counts summary |
| GET `/api/decks/:id` | deck + expanded card list |

## Games
| Route | Notes |
|---|---|
| GET `/api/games` | `{waiting, mine, recent}` buckets for the lobby |
| POST `/api/games` | `{deckId, name?}` → creates `waiting` game, caller = host/seat 0. Snapshots rules + deck + card set at creation... guest cards snapshotted at join. |
| POST `/api/games/:id/join` | `{deckId}` → seats caller as guest, extends cardSet snapshot, **initializes engine state**, status→active |
| GET `/api/games/:id` | game meta (no state — state flows over WS) |
| DELETE `/api/games/:id` | host while `waiting`; admin anytime |

## Admin (403 unless `isAdmin`)
| Route | Notes |
|---|---|
| GET `/api/admin/users` · PATCH `/api/admin/users/:id` `{isAdmin?|newPassword?}` · DELETE | can't demote/delete yourself |
| GET `/api/admin/games` · DELETE `/api/admin/games/:id` | abandon/purge stuck games |
| POST `/api/admin/cards` `{slug?, name, color, type, cost, power?, health?, text, effects, artUrl?}` | new card; procedural art if no artUrl |
| PATCH `/api/admin/cards/:slug` | numeric/text/effects edits; running games unaffected (snapshots) |
| DELETE `/api/admin/cards/:slug` | soft-deactivate |
| GET/POST/PATCH/DELETE `/api/admin/decks[...]` | prebuilt deck CRUD; legality validated |
| GET `/api/admin/rules` · PATCH `/api/admin/rules/:id` `{config}` · POST (clone) | parameter tuning |

## Health
GET `/healthz` → `{ok:true, db:true}` (used by fly checks and docker).

---

## WebSocket `/ws?gameId=<id>`

Cookie-authenticated at upgrade. One room per game. Participants get seat views; other users get the spectator view.

**Client → server**
```
{t:"action", action: GameAction}     // engine-validated; seat inferred from auth
{t:"undo"}                            // rewind one action (participants only)
{t:"ping"}
```

**Server → client**
```
{t:"state", seq, view: PlayerView, meta:{names, status}}   // full view every change (states are small)
{t:"gameOver", winnerSeat, reason, view}
{t:"presence", online:[seat0:boolean, seat1:boolean, spectators:number]}
{t:"error", code:"illegal"|"not-your-window"|"bad-msg", msg}
{t:"pong"}
```

- Server is authoritative: load state (cache or replay) → `applyAction` → persist event + cache → broadcast per-viewer views. Illegal actions return `error` and no broadcast.
- Reconnect = reopen socket; server pushes current state immediately on join.
- `PlayerView` (defined in `packages/engine/src/view.ts`, imported by server and web): seat-relative — `you/them` (life, handCount, deckCount, discard, resources), `zones[3]` ordered [your home, neutral, their home], `influence` (+ = toward you), `turn/phase/activeSeat/actorSeat`, `yourHand`, `legalHints` (playable card ids, attackable pairs — derived via `getLegalActions`), `log` (last 100 events), `winner`.
