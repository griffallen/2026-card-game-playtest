import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.ts'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } }, // both test files share one test DB — run serially
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
