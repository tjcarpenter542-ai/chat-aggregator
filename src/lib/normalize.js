// Canonical message shape used everywhere:
//   { source, channel, username, message, timestamp, id, type, sub? }
// `source` is the platform; `channel` is the specific streamer/feed it came from (used for inline
// attribution and per-feed display filtering). `type` is 'chat' (default) or 'sub'; `sub` is
// optional metadata for sub events. Every connector funnels its platform-specific payload through
// this so the rest of the app never deals with per-platform quirks. Fills sane defaults.
export function normalize({ source, channel, username, message, timestamp, id, type, sub }) {
  const ts = Number(timestamp)
  const out = {
    source: String(source || 'unknown'),
    channel: channel ? String(channel).slice(0, 80) : '',
    username: String(username || 'anonymous').slice(0, 64),
    message: String(message ?? '').slice(0, 1000),
    timestamp: Number.isFinite(ts) && ts > 0 ? ts : Date.now(),
    id: id ? String(id) : generateId(source),
    type: type === 'sub' ? 'sub' : 'chat',
  }
  if (sub) out.sub = sub
  return out
}

let idCounter = 0
function generateId(source) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // Fallback for legacy runtimes without crypto.randomUUID. A monotonic counter makes
  // ids unique even for two messages generated in the same millisecond.
  idCounter = (idCounter + 1) % Number.MAX_SAFE_INTEGER
  return `${source || 'msg'}-${Date.now()}-${idCounter}-${Math.floor(Math.random() * 1e9)}`
}
