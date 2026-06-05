// Tunable engine + app constants. Tweak these to change behavior globally.

// --- Rolling-window keyword / sentiment / spike engine ---
export const WINDOW_MS = 60_000 // "current" window: last 60s of messages
export const BASELINE_MS = 300_000 // baseline window: last 5 min (for spike comparison)
export const SPIKE_RATIO = 3.0 // current rate must be >= this * baseline rate to spike
export const MIN_SPIKE_COUNT = 4 // ...and the word must appear at least this many times now
export const MIN_SPIKE_SOURCES = 2 // ...across at least this many distinct platforms
export const SPIKE_BANNER_MS = 9000 // hold a fired spike in the snapshot this long for the banner (or until a new spike replaces it)
export const TOP_N = 12 // number of trending words shown in the keyword bar
export const TICK_MS = 1000 // engine tick + snapshot cadence (1s)
export const MIN_TOKEN_LEN = 3 // ignore tokens shorter than this for trending/spikes

// --- Feed ---
export const MAX_MESSAGES = 1000 // hard cap on retained messages (memory bound)
export const FLUSH_MS = 250 // batch incoming messages into React state this often

// --- Reconnection (used by reconnectingSocket) ---
export const RECONNECT_BASE_MS = 1000
export const RECONNECT_MAX_MS = 30_000
export const HEARTBEAT_TIMEOUT_MS = 90_000 // no inbound traffic this long -> force reconnect
export const KEEPALIVE_MS = 45_000 // send a client keepalive ping this often (< HEARTBEAT_TIMEOUT_MS)
