import { defineConfig } from 'vitest/config'

// Standalone config so the recap unit tests don't pull in the app's React/Tailwind vite plugins —
// they exercise pure TS (composeCombatRecap) against the engine, no DOM.
export default defineConfig({
  // local.ts reads __ART_VER__ (injected by the app's vite.config `define` at build time) to
  // cache-bust card art; give it a stub so the deck-parity unit tests can import local.ts here.
  define: { __ART_VER__: JSON.stringify('test') },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
