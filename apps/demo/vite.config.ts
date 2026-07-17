import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Card art lives at stable un-hashed URLs (/cards/<slug>.jpg) and is overwritten in
// place when Griff sends new art (#103). Without a version query the browser/Pages CDN
// serves the stale cached image, so a fresh deploy looks unchanged. Stamp every art URL
// with the build's commit SHA — a new deploy = a new URL = a guaranteed fresh fetch.
const ART_VER = (() => {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: fileURLToPath(new URL('.', import.meta.url)),
    }).toString().trim()
  } catch {
    return Date.now().toString(36)
  }
})()

// Static, backend-free build for GitHub Pages: relative base + hash routing,
// card art reused from the web app's public dir.
export default defineConfig({
  base: './',
  publicDir: '../web/public',
  define: { __ART_VER__: JSON.stringify(ART_VER) },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@ui': fileURLToPath(new URL('../web/src', import.meta.url)),
      '@docs': fileURLToPath(new URL('../../docs', import.meta.url)),
    },
  },
})
