---
name: verify
description: Build, run, and drive this repo's card game prototype end-to-end — server boot, two-browser game drive, screenshots.
---

# Verifying the card game prototype

## Build + boot (local)

```bash
# prereqs once: brew services start postgresql@14; createdb cardgame_dev cardgame_test
# env lives in apps/server/.env (DATABASE_URL/DIRECT_URL/DATABASE_URL_TEST with explicit user)
npm install
npx -w apps/server prisma migrate dev     # or migrate deploy
npx -w apps/server tsx prisma/seed.ts     # idempotent: admin + 84 cards + 2 decks
npm run build -w apps/web                 # server serves apps/web/dist statically
(cd apps/server && npx tsx src/index.ts &)  # :3000 — Prisma client auto-reads ./.env
curl -s localhost:3000/healthz            # {"ok":true,"db":true}
```

## Drive the real UI (two players)

```bash
npx tsx scripts/verify-drive.ts
```

Registers two fresh users (unique suffix each run), creates a table with the red deck, joins with yellow, then plays ~26 actions by clicking the actual UI (bank/keep in resource step, play-with-targeting, pass). Screenshots land in the session scratchpad (`shot-login/create/table-start/table-host/table-guest/cards.png`) — **Read them**: board state, chain overlays on imprisoned units, influence marker, and the chronicle log are the visual truth.

Uses `playwright-core` + system Chrome (`channel: 'chrome'`) — no browser download.

## Production image rehearsal

```bash
docker compose -f docker-compose.prod-test.yml up --build   # app :3000, throwaway PG :5433
```

## Gotchas

- Kill any dev server before compose (`pkill -f "tsx src/index.ts"`) — both want :3000.
- Expected console noise: one 401 per fresh page load (`/api/auth/me` pre-login probe).
- Server tests hard-abort unless `DATABASE_URL_TEST` differs from `DATABASE_URL` — that's the safety working, not breakage.
- WS frames interleave `presence` between `state`s — scripted clients must filter by frame type.
