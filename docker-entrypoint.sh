#!/bin/sh
set -e
# Neon: set DATABASE_URL to the pooled string and DIRECT_URL to the direct one.
# Anywhere else: DATABASE_URL alone is enough.
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"

echo "→ applying migrations"
node_modules/.bin/prisma migrate deploy --schema apps/server/prisma/schema.prisma

echo "→ seeding baseline data (idempotent)"
node_modules/.bin/tsx apps/server/prisma/seed.ts

echo "→ starting server"
exec node_modules/.bin/tsx apps/server/src/index.ts
