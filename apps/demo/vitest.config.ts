import { defineConfig } from 'vitest/config'

// Standalone config so the recap unit tests don't pull in the app's React/Tailwind vite plugins —
// they exercise pure TS (composeCombatRecap) against the engine, no DOM.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
