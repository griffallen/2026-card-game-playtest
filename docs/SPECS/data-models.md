# Data Models Spec

Prisma/PostgreSQL. Engine state is **event-sourced**: the `GameEvent` log is the save; `Game.stateCache` is a derived convenience.

## User
| field | type | notes |
|---|---|---|
| id | cuid PK | |
| username | text unique | stored lowercase, 3–24 chars `[a-z0-9_-]` |
| passwordHash | text | `scrypt$N$r$p$salthex$hashhex` (Node crypto, no dependency) |
| isAdmin | bool default false | seed creates the first admin |
| createdAt | timestamp | |

Deletion: admin-only; blocked while the user has non-finished games (finish/abandon them first).

## Session
`id` (random 32-byte hex token PK) · `userId` FK cascade · `expiresAt` (30 days sliding) · `createdAt`. Cookie `sid`, httpOnly, SameSite=Lax, Secure in prod.

## RulesVersion
`id` cuid · `name` unique (e.g. `v1.2-proto`) · `config` Json (`RulesConfig`, see game-rules §2) · `isDefault` bool · timestamps. Admin edits create sane history by cloning to a new row; a `Game` snapshots the config at creation, so editing never touches running games.

## Card
| field | type | notes |
|---|---|---|
| slug | text PK | kebab-case of name |
| name, text | text | display |
| color | enum red\|yellow\|neutral | |
| type | enum unit\|action\|upgrade | |
| cost | int ≥0 | |
| power, health | int, null for non-units | |
| effects | Json | structured effect DSL (game-rules §3) — never free text |
| artUrl | text null | `/cards/{slug}.jpg` for sliced art; null ⇒ procedural art from slug seed |
| designerNote | text null | ⚑ flags from the reconciliation (shown in card browser) |
| active | bool default true | soft delete — decks may reference retired cards |
| createdAt/updatedAt | | |

## Deck / DeckCard
Deck: `id` cuid · `name` · `description` null · `color` hint · `ownerId` FK null (**null = shared prebuilt**) · `isPrebuilt` bool · timestamps.
DeckCard: `deckId`+`cardSlug` composite PK · `count` int 1–maxCopies. Legality (≥ deckMinSize, ≤ maxCopies) enforced at write time in the API against the deck's rules version (default rules).
Deletion: prebuilt decks referenced by non-finished games can't be deleted.

## Game
| field | type | notes |
|---|---|---|
| id | cuid PK | |
| name | text | default "Host's game" |
| status | enum waiting\|active\|finished\|abandoned | |
| seed | int | crypto-random at creation, recorded for determinism |
| rulesConfig | Json | snapshot at creation |
| cardSet | Json | snapshot `{slug → CardDef}` of every card in either deck |
| hostId / guestId | FK User, guest null while waiting | seat 0 = host, seat 1 = guest |
| hostDeck / guestDeck | Json `{name, slugs: string[]}` snapshot | deck edits never corrupt games |
| currentSeq | int default 0 | last applied event seq |
| stateCache | Json null | latest `GameState` (derivable; replay on miss) |
| winnerSeat | int null · winReason text null (`life`\|`influence`\|`concede`) | |
| createdAt/updatedAt/finishedAt | | |

## GameEvent
`id` cuid · `gameId` FK cascade · `seq` int (unique per game, `@@unique([gameId, seq])`) · `actorSeat` int null · `action` Json (`GameAction`) · `createdAt`.
Undo = delete the last event, replay from seed. Replay contract: `(seed, rulesConfig, cardSet, decks, events[0..n]) → identical state`, guaranteed by engine determinism (game-rules §1.13).
