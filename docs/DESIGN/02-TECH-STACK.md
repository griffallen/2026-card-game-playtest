# Tech Stack

Recommended stack for the card game prototype — opinionated defaults chosen for stability, maintainability, and the GENESYS goals (node + postgres preference, cheap VPS deploy, network play later, a serious simulation harness).

**This is a seed, not a decision.** The builder reviews it during the design phase. Change anything — just record the reasoning.

## The one architectural rule

**The game engine is a pure TypeScript package.** No database, no HTTP, no UI, no wall-clock time, no unseeded randomness. It takes (rules version + decks + seed + player actions) and produces game states. Everything else — server, play UI, simulations, AI players — consumes it. This is what makes the GENESYS test suite ("simulate a variety of games, ensure win conditions are possible, monte-carlo balance") cheap instead of impossible.

## Runtime and language

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Node.js (LTS) | GENESYS preference; huge ecosystem |
| Language | TypeScript | Card and effect data benefit enormously from types |
| Package manager | npm workspaces | Ships with Node; keeps engine/server/web separate |

## Backend

| Component | Choice | Why |
|-----------|--------|-----|
| Web framework | Fastify | Fast, well-documented, first-class JSON schema validation |
| Realtime | `@fastify/websocket` | Network play needs a socket; start simple |
| ORM | Prisma | Type-safe access, excellent migration tooling |
| Database | PostgreSQL | GENESYS preference; multi-user from day one; local dev via Docker |

## Frontend

| Component | Choice | Why |
|-----------|--------|-----|
| Framework | React + Vite | The play table is a real-time interactive board — server-rendered templates would fight it. Deck builder and admin ride along. |
| Styling | Tailwind CSS | Rapid prototyping without inventing a CSS architecture |

## Testing

| Component | Choice | Why |
|-----------|--------|-----|
| Runner | Vitest | Fast, TypeScript-native |
| Engine tests | Plain Vitest, no mocks | The engine is pure — tests are data in, data out |
| API tests | Fastify `.inject()` + dedicated test DB | No server spin-up; never touches the dev database |
| Simulation | Harness consuming `packages/engine` directly | Seeded, headless; thousands of games per minute is the goal |

## Layout

```
packages/engine     pure game engine: mechanics (code) + parameters (data) + seeded RNG
apps/server         Fastify: REST + WebSocket + Prisma/Postgres
apps/web            React: deck builder, admin, play table
```

---

> **Alternatives worth considering** if the builder prefers: SQLite for a zero-config start (Prisma makes a later swap cheap-ish, but network play wants Postgres eventually) · Drizzle instead of Prisma · Svelte instead of React. The engine-purity rule is the only thing this document is genuinely attached to.
