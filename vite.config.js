import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// NOTE: `server.proxy` is DEV-ONLY. It does NOT run during `vite build` / `vite preview`.
// The `/kick-api` proxy works around CORS on Kick's channel-lookup endpoint during dev.
// Kick also sits behind Cloudflare (TLS fingerprinting), so this can still 403 — the app
// falls back to a manually-entered chatroom ID. A production deployment would need a real
// backend/serverless proxy (ideally curl-impersonate-style) to fetch the chatroom id.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/kick-api': {
        target: 'https://kick.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kick-api/, ''),
        headers: {
          // Present as a normal browser to reduce (not eliminate) Cloudflare blocks.
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      },
    },
  },
})
