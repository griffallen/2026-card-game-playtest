# New Game — card game design & prototype

An original card game in development. The designer designs, Blaine builds, and an AI agent (Claude Code) turns design conversations into specs, code, and a playable prototype.

## Getting started

1. Install [Claude Code](https://claude.com/claude-code) (ask Blaine if you get stuck).
2. Open this folder in a terminal and run `claude`.
3. Say **"hi — let's pick up where we left off."** The agent reads the project state and takes it from there.

That's it. Nothing else to install for the design and spec phases — no Node, no database, no code tools. The agent will say when (and if) that changes.

When you're done for the day, say **"let's wrap up"** — the agent saves a session summary and a handoff so the next session (yours or Blaine's) picks up exactly where this one left off.

## Try it right now — no install

**https://blainebooher.com/new-game-demo/** — the full rules engine running in your browser: play hotseat or vs a baseline AI, watch bot games, run batch simulations, and read the design audit. Every game exports a seed + action log for perfectly reproducible bug/balance reports. Redeploy after changes with `./scripts/deploy-demo.sh` (publishes to the public `new-game-demo` repo — Pages isn't available on this private repo's plan).

## The prototype is live

A playable two-player online prototype now exists: accounts, deck selection, remote play over websockets, spectators, undo, a card browser, and an admin hall for tuning cards/decks/rules without code.

```bash
npm install && npm run db:migrate -w apps/server && npm run db:seed -w apps/server
npm run dev            # → http://localhost:5173  (needs local Postgres — see README-DEPLOY.md)
```

- **How the game plays:** `docs/GAME-FLOW.md` — written for the designer, with every prototype ruling flagged ⚑
- **Deploying it (fly.io + Neon):** `README-DEPLOY.md`
- **Tests:** `npm test` — engine + API + a 150-game simulation that must finish clean

## What's in here

| Path | What it is |
|------|-----------|
| `CLAUDE.md` | The agent's guide: roles, session protocol, working principles |
| `docs/GAME-FLOW.md` | **How the prototype plays** — the designer-facing rules narrative |
| `docs/DESIGN/01-GENESYS.md` | The creative brief — what we're building and why |
| `docs/DESIGN/DECISIONS.md` | Every design decision/assumption, numbered, with reasons |
| `docs/DESIGN/03-BUILD-PLAN.md` | The build plan the prototype was implemented from |
| `docs/SPECS/` | Rules / data / API / views / simulation specs |
| `docs/AGENT/` | Phase playbooks the agent follows |
| `docs/REFERENCES/` | Original rules docs and spreadsheet; agent-readable extractions in `extracted/` |
| `docs/PROMPTS/` | Session summaries and the current handoff prompt |
| `packages/engine` | Pure deterministic game engine (rules as code + data) |
| `apps/server` | Fastify: REST + WebSocket + Prisma/Postgres |
| `apps/web` | React play table, lobby, card browser, admin |

## How this works

The project moves in a loop: **design → spec → build plan → implement → playtest** — then loops again as playtesting changes the rules. Sessions are the unit of work: each one starts from the last handoff and ends with a new one, so either of us can pick up wherever the other left off.
