// Per-channel sliding-window message-rate meter.
//
// "msg/min" is the LITERAL COUNT of a channel's messages whose timestamp falls within the trailing
// RATE_WINDOW_MS (60s), recomputed every tick by aging timestamps out of the window. It's a
// measured fact — "N messages actually arrived in the last minute" — not an extrapolation from a
// one-second delta, so it moves smoothly: the number changes only as messages enter or leave the
// 60s window. A steady 120/min reads ~120 and holds; a burst raises it by exactly the burst size
// (no ×60 amplification of a single tick); a channel going quiet decays to 0 as its messages age
// out. This replaces the old EMA-of-an-extrapolated-delta meter, which bounced because it scaled a
// single tick's count up to a per-minute figure.
//
// Memory is bounded two ways: every tick prunes timestamps older than the window, and the buffer is
// hard-capped at MAX_SAMPLES, so a firehose/raid can't grow it without bound — the reported rate
// just saturates near the cap (an accepted approximation at the very top end).

const RATE_WINDOW_MS = 60_000 // count over the last minute -> the count IS the msgs/min figure

// ~5000 msgs / 60s ≈ 83 msg/sec sustained — far above any single real chat, so the cap only bites
// in an extreme raid, where an approximate ceiling on the displayed number is acceptable.
export const MAX_SAMPLES = 5000

// Briefly show "measuring…" right after a channel's first message, so a 1–2s connect flurry isn't
// surfaced before we've watched the channel for a moment. After the warm-up the true filling-window
// count is shown; because that count only ramps UP from 0 as the window fills, it can never read as
// a false high spike (unlike extrapolating a partial window up to a full minute).
export const RATE_WARMUP_MS = 3000

export function newRateState() {
  return { stamps: [], since: null }
}

// Record one message arrival by its timestamp. O(1) amortized.
export function recordMessage(state, ts) {
  if (state.since === null) state.since = ts
  const s = state.stamps
  s.push(ts)
  // Belt-and-suspenders bound for a pathological single-interval burst (e.g. a slept/backgrounded
  // tab dumping buffered socket frames before the next tick can prune): trim the oldest in one shot.
  if (s.length > MAX_SAMPLES * 2) s.splice(0, s.length - MAX_SAMPLES)
}

// Advance one tick: drop timestamps that have aged out of the trailing 60s window, enforce the
// cap, and return the count that remains — that count IS the messages-per-minute rate. Mutates
// `state` (prunes its buffer in place). A channel's stamps arrive in order from its own socket, so
// the buffer is effectively sorted ascending and the aged-out entries cluster at the front.
export function tickRate(state, now) {
  const cutoff = now - RATE_WINDOW_MS
  const s = state.stamps
  let start = 0
  while (start < s.length && s[start] < cutoff) start++
  // Hard cap: keep only the most recent MAX_SAMPLES (approximate at the very top end).
  if (s.length - start > MAX_SAMPLES) start = s.length - MAX_SAMPLES
  if (start > 0) state.stamps = s.slice(start)
  return state.stamps.length
}

// A channel's rate is worth showing once we've watched it for the warm-up span; before that the UI
// shows "measuring…". The first message starts the clock; once past it, a now-quiet channel still
// reports a real (possibly 0) rate rather than reverting to "measuring…".
export function isRateReady(state, now) {
  return state.since !== null && now - state.since >= RATE_WARMUP_MS
}
