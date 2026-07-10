# New Game — card game design & prototype

An original card game in development. **Griff designs, Blaine builds**, and an AI agent (Claude
Code) turns design conversations into specs, code, and a playable prototype — the whole loop runs
through this repo.

## 🎮 Play it right now — no install

**https://blainebooher.com/new-game-demo/** — the full rules engine in your browser. Play hotseat
or vs the AI, watch bot games, run simulations, browse every card, and read the design audit.
Three decks: **Crimson Assault** (red), **Radiant Order** (yellow), and the **Veiled Court**
(purple — a proposal awaiting your verdict).

## ✍️ For Griff — how to change the game (pick one, no tools needed)

Everything below happens right here on github.com. No installs, no code, no format rules.

**1. Say what you think → [open an issue](../../issues/new).**
Plain words: *"red feels unstoppable after round 6"*, *"prison isn't fun, cut it"*, *"can
Berserker cost 1?"* The agent picks up every issue at the start of each working session, answers
on the thread, and folds accepted changes into the game. There's a set of open design questions
waiting for you in the [issue tracker](../../issues) already.

**2. Change a card yourself → edit its file.**
Every card is one small file in [`data/cards/`](data/cards/) — browse the
[full table](data/cards/INDEX.md), click a card, hit the ✏️ pencil, change the number or the
text, and choose **"Create a new branch and start a pull request."** The agent reviews every card
PR (is it valid? does the text match what it does? does it obey its
[deck's charter](docs/canon/decks/)?), wires up any mechanics, and merges. A typo can't break the
game — the build refuses bad edits with a readable message. Full guide:
[`data/cards/README.md`](data/cards/README.md).

**3. Go deep → run a design session.**
Install [Claude Code](https://claude.com/claude-code), open this folder in a terminal, run
`claude`, and say **"hi — let's pick up where we left off."** The agent reads the project state
and takes it from there. Say **"let's wrap up"** when done and it writes the handoff for the next
session.

**What the game is right now:** [`docs/GAME-FLOW.md`](docs/GAME-FLOW.md) — the rules as a story,
every prototype ruling flagged ⚑. The locked baseline lives in
[`docs/canon/CANON.md`](docs/canon/CANON.md); the why-log of every decision is
[`docs/DESIGN/DECISIONS.md`](docs/DESIGN/DECISIONS.md). **Feel and balance are yours** — the agent
never rejects a card for being strong, only for being broken, dishonest, or off-color.

## 🔧 For the builder

```bash
npm install && npm run db:migrate -w apps/server && npm run db:seed -w apps/server
npm run dev            # → http://localhost:5173  (needs local Postgres — see README-DEPLOY.md)
npm test               # engine + API + a 150-game simulation that must finish clean
npm run cards          # compile data/cards/ → engine (cards:check is the PR gate)
./scripts/deploy-demo.sh   # publish the browser demo (public new-game-demo repo / Pages)
```

The two-player online prototype (accounts, remote play over websockets, spectators, undo, admin
hall for cards/decks/rules) lives in `apps/server` + `apps/web`; deploy notes in
`README-DEPLOY.md`.

## What's in here

| Path | What it is |
|------|-----------|
| `data/cards/` | **The card ledger — one file per card, the single source of truth** |
| `docs/GAME-FLOW.md` | How the prototype plays — the designer-facing rules narrative |
| `docs/canon/` | The locked baseline: CANON index + a charter per deck (the design law) |
| `docs/SPECS/game-rules.md` | The precise ruleset — the engine's contract |
| `docs/DESIGN/DECISIONS.md` | Every design decision, numbered, with reasons |
| `docs/PLAYTESTS/` | Playtest + simulation campaign records |
| `docs/PROMPTS/` | Session summaries and the current handoff prompt |
| `CLAUDE.md` | The agent's guide: roles, session protocol, working principles |
| `packages/engine` | Pure deterministic game engine (rules as code + data) |
| `apps/server` / `apps/web` | Fastify + Prisma multiplayer server / React play table & admin |
| `apps/demo` | The standalone browser demo (what's deployed publicly) |

## How this works

The project moves in a loop: **design → spec → build plan → implement → playtest** — then loops
again as playtesting changes the rules. Sessions are the unit of work: each starts from the last
handoff and ends with a new one, so anyone (or the agent alone, overnight) can pick up exactly
where the last session left off.
