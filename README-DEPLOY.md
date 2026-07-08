# Deploying — fly.io + Neon

The app is one container: Fastify serves the API, the WebSocket, and the built web UI on one port. On boot it runs `prisma migrate deploy` and an idempotent seed (admin account, 84 cards, prebuilt decks, rules v1.2-proto), so a fresh database becomes a playable install with zero manual steps.

## Already wired (2026-07-07)

CI/CD is armed: the fly app **`new-game-proto`** exists, a scoped deploy token lives in the repo secret `FLY_API_TOKEN`, and `.github/workflows/fly-deploy.yml` deploys **every push to `main`**. It's gated off until the database exists. To go live, do the one human step (Neon needs a browser login) and flip the gate:

```bash
# 1. create a Neon project (neon.tech, free tier) and copy BOTH connection strings
# 2. from the repo root:
fly secrets set -a new-game-proto \
  DATABASE_URL='postgresql://…-pooler…neon.tech/neondb?sslmode=require' \
  DIRECT_URL='postgresql://….neon.tech/neondb?sslmode=require' \
  ADMIN_PASSWORD='pick-something-real'
gh variable set DEPLOY_ENABLED --body true
gh workflow run fly-deploy          # first deploy now; every push auto-deploys after
```

Watch it: `gh run watch` · then `fly open -a new-game-proto`.

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

- **One machine.** Game rooms live in process memory (the DB event log is the source of truth, so restarts/reconnects are safe — clients just reopen). Don't scale to 2+ machines without adding a pub/sub layer. The CI workflow passes `--ha=false` for exactly this reason (fly defaults to two machines).
- **Free-tier posture:** single shared-cpu-1x / 256MB (+512MB swap), `auto_stop_machines = "suspend"`, `min_machines_running = 0`. Fly never suspends a machine with open connections (websockets count), so live games are safe; an idle app suspends and costs pennies. Fly waives invoices under ~$5/mo, so this runs effectively free. First request after a long idle takes a few seconds while the machine wakes. If 256MB ever OOMs under load: `fly scale memory 512 -a new-game-proto` (~$3.19/mo, still under the waiver).
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
