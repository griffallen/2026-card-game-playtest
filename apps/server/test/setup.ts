/**
 * Test harness guardrails (CLAUDE.md mandate): tests run ONLY against DATABASE_URL_TEST,
 * and abort hard if it matches the dev database.
 */
import { execSync } from 'node:child_process'

// setupFiles runs once per test file in the same fork — swap the env exactly once
if (!process.env.__TEST_DB_READY) {
  try { process.loadEnvFile(new URL('../.env', import.meta.url).pathname) } catch { /* env injected directly (CI) */ }

  const test = process.env.DATABASE_URL_TEST
  const dev = process.env.DATABASE_URL
  if (!test) throw new Error('DATABASE_URL_TEST is not set — refusing to run server tests')
  if (dev && dev === test) throw new Error('DATABASE_URL_TEST equals DATABASE_URL — refusing to touch the dev database')

  process.env.DATABASE_URL = test
  process.env.DIRECT_URL = test
  process.env.NODE_ENV = 'test'
  process.env.ADMIN_PASSWORD = 'test-admin-pw'

  execSync('npx prisma migrate deploy', { env: { ...process.env }, stdio: 'pipe' })
  process.env.__TEST_DB_READY = '1'
}

// fresh slate + baseline seed (dynamic imports so the env swap above happens first)
const { prisma } = await import('../src/db.ts')
const { seedCore } = await import('../src/seedCore.ts')
await prisma.$executeRawUnsafe(
  'TRUNCATE "GameEvent","Game","DeckCard","Deck","Session","User","Card","RulesVersion" CASCADE',
)
await seedCore('test-admin-pw')
