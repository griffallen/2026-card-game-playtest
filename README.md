# New Game — card game design & prototype

An original card game in development. The designer designs, Blaine builds, and an AI agent (Claude Code) turns design conversations into specs, code, and a playable prototype.

## Getting started

1. Install [Claude Code](https://claude.com/claude-code) (ask Blaine if you get stuck).
2. Open this folder in a terminal and run `claude`.
3. Say **"hi — let's pick up where we left off."** The agent reads the project state and takes it from there.

That's it. Nothing else to install for the design and spec phases — no Node, no database, no code tools. The agent will say when (and if) that changes.

When you're done for the day, say **"let's wrap up"** — the agent saves a session summary and a handoff so the next session (yours or Blaine's) picks up exactly where this one left off.

## What's in here

| Path | What it is |
|------|-----------|
| `CLAUDE.md` | The agent's guide: roles, session protocol, working principles |
| `docs/DESIGN/01-GENESYS.md` | The creative brief — what we're building and why |
| `docs/DESIGN/02-TECH-STACK.md` | Recommended tech (Blaine reviews during design) |
| `docs/AGENT/` | Phase playbooks the agent follows |
| `docs/REFERENCES/` | Original rules docs and spreadsheet; agent-readable extractions in `extracted/` |
| `docs/SPECS/` | The specs — written during the spec phase |
| `docs/PROMPTS/` | Session summaries and the current handoff prompt |

## How this works

The project moves in a loop: **design → spec → build plan → implement → playtest** — then loops again as playtesting changes the rules. Sessions are the unit of work: each one starts from the last handoff and ends with a new one, so either of us can pick up wherever the other left off.
