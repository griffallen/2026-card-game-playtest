# Deploying — fly.io + Neon

The app is one container: Fastify serves the API, the WebSocket, and the built web UI on one port. On boot it runs `prisma migrate deploy` and an idempotent seed (admin account, 84 cards, prebuilt decks, rules v1.2-proto), so a fresh database becomes a playable install with zero manual steps.

## 0. Rehearse locally first

```bash
docker compose -f docker-compose.prod-test.yml up --build
# → http://localhost:3000 against a throwaway Postgres on :5433
```

## 1. Neon (database)

1. Create a project at [neon.tech](https://neon.tech) (free tier is plenty).
2. From the dashboard grab **two** connection strings:
   - the **pooled** one (`…-pooler.…neon.tech/…`) → this is `DATABASE_URL`
   - the **direct** one (no `-pooler`) → this is `DIRECT_URL` (migrations need it)
3. Both must keep `?sslmode=require`.

## 2. fly.io (app)

```bash
brew install flyctl && fly auth login

# from the repo root — fly.toml is already written. Say NO to Postgres/Redis prompts,
# NO to deploy-now, and let it keep the existing Dockerfile + fly.toml.
fly launch --copy-config --no-deploy    # pick a unique app name if new-game-proto is taken

fly secrets set \
  DATABASE_URL='postgresql://…-pooler…neon.tech/neondb?sslmode=require' \
  DIRECT_URL='postgresql://….neon.tech/neondb?sslmode=require' \
  ADMIN_PASSWORD='pick-something-real'

fly deploy
fly open          # → register accounts, log in as admin / $ADMIN_PASSWORD for the Admin hall
```

Redeploys are just `fly deploy`. Migrations + seed run on every boot and are safe to repeat; card/deck edits made in the admin UI are never overwritten by the seed.

## Notes

- **One machine.** Game rooms live in process memory (the DB event log is the source of truth, so restarts/reconnects are safe — clients just reopen). Don't scale to 2+ machines without adding a pub/sub layer.
- `fly.toml` keeps `auto_stop_machines = "off"` so websockets don't die mid-game; a single shared-cpu-1x/512MB machine runs this comfortably (~$3-4/mo, or free-ish with fly's allowances).
- Any other Docker host works the same: supply `DATABASE_URL` (+ optional `DIRECT_URL`, `ADMIN_PASSWORD`, `PORT`) and run the image.
- Health check: `GET /healthz` → `{"ok":true,"db":true}`.

## Local development (for reference)

```bash
brew services start postgresql@14        # or: docker compose -f docker-compose.dev.yml up -d
createdb cardgame_dev && createdb cardgame_test
cp .env.example apps/server/.env         # fill in your OS username in the URLs
npm install
npm run db:migrate -w apps/server && npm run db:seed -w apps/server
npm run dev                              # server :3000 + vite :5173 (proxied)
npm test                                 # engine (57) + server (8); sim plays 150 games
```
