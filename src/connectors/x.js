// X (Twitter) connector — STUB. The real v2 endpoints are paid and CANNOT be called from the
// browser (CORS + the bearer token must never ship to the client). This stays a no-op unless
// VITE_X_ENABLED === 'true', and even then it makes no request and emits no messages.
//
// Intended real flow (server-side only, for reference — do NOT implement in the browser):
//   GET  https://api.twitter.com/2/tweets/search/recent?query=...          (Basic tier)
//   GET  https://api.twitter.com/2/tweets/search/stream                    (Pro tier ~$500/mo)
//   POST https://api.twitter.com/2/tweets/search/stream/rules              (manage stream rules)
//   header: Authorization: Bearer <app-only token>   (held by a backend proxy, NOT here)
// A backend would fetch those, normalize() each tweet, and push to this app via its own socket.
export function createXConnector({ channel, onStatus }) {
  const enabled = import.meta.env.VITE_X_ENABLED === 'true'

  if (!enabled) {
    onStatus?.('disabled', 'X disabled (set VITE_X_ENABLED=true)')
    return { close: () => {} }
  }

  // Enabled, but intentionally still a no-op: we will not call a paid API from the browser
  // or ship a token. It reports status 'open' but emits NO messages — a silent X feed is
  // expected, not a bug. Wire a server-side proxy to make this live.
  console.warn(
    `[x] VITE_X_ENABLED=true for "${channel}", but the X connector is a stub. ` +
      'Add a server-side proxy to https://api.twitter.com/2/tweets/search/recent ' +
      '(Authorization: Bearer <token>) and feed normalized messages in from there.',
  )
  onStatus?.('open', 'X stub — no live data')
  return { close: () => {} }
}
