import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Static, backend-free build for GitHub Pages: relative base + hash routing,
// card art reused from the web app's public dir.
export default defineConfig({
  base: './',
  publicDir: '../web/public',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@ui': fileURLToPath(new URL('../web/src', import.meta.url)),
    },
  },
})
