import { TICK_MS } from './constants.js'

// Per-channel messages-per-minute meter, designed to avoid a cold-start false spike.
//
// The naive approach — extrapolate the first tick's message count to a per-minute figure — reads
// far too high on connect: a channel's per-channel stat is born the instant its FIRST message
// arrives, so the first tick's window is a PARTIAL one (often well under a second) and frequently
// carries the connection-time flurry. Multiplying that by 60 turns a one-off burst of 8 messages
// into a phantom "240 msg/min". So:
//   * the FIRST tick after a channel appears only establishes a baseline — it never yields a rate
//     (its window is partial / burst-dominated and not representative of sustained flow);
//   * subsequent FULL-tick deltas are EMA-smoothed (responsive, but not jittery);
//   * `ready` stays false through a short warm-up so the UI can show "measuring…" instead of a
//     misleading number while the average settles.
// Steady-state is unchanged: it still converges to the true rate and decays toward 0 when quiet.
const RATE_ALPHA = 0.5
export const RATE_WARMUP_TICKS = 4

export function newRateState() {
  return { rate: 0, ticks: 0 }
}

// Advance one tick. `delta` = messages observed since the previous tick. Returns a NEW state
// (callers persist it). The first tick is baseline-only; later ticks fold a full-window
// instantaneous rate into the EMA.
export function tickRate(state, delta) {
  const ticks = state.ticks + 1
  let rate = state.rate
  if (ticks > 1) {
    const inst = delta * (60_000 / TICK_MS) // one full tick's delta -> per minute
    rate = RATE_ALPHA * inst + (1 - RATE_ALPHA) * rate
  }
  return { rate, ticks }
}

// A channel's rate is worth displaying only once it's past the warm-up (and so past the first
// partial/burst tick). Before that the UI should show "measuring…".
export const isRateReady = (state) => state.ticks >= RATE_WARMUP_TICKS
