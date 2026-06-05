# Chat Aggregator — Twitch · Kick · X

A Vite + React single-page app that merges live chat from **Twitch**, **Kick**, and **X** into
one labeled, timestamp-sorted feed — with a **live keyword/sentiment engine** layered on top.

One rolling-window engine powers two views from the same data:

- **Keyword + sentiment bar** (pinned top) — top trending words, sized by frequency, updating
  every second, plus a positive/negative sentiment lean.
- **Cross-platform spike alert** — when a word jumps sharply above its baseline **and** appears
  in **2+ platforms** in the same window, a banner fires.

## Quick start

```bash
npm install
cp .env.example .env   # then edit it — the example channels are placeholders (see below)
npm run dev            # http://localhost:5173
```

A fresh clone connects to nothing: the `VITE_DEFAULT_CHANNELS` shipped in `.env.example` are
placeholders that are intentionally filtered out at startup. Add a feed live from the UI, or set
your own channels in `.env` first.

To add a feed: pick a source, type the channel, and hit **Add feed**. For **Kick** you must also
enter the numeric **chatroom ID** (find it at [b3ck.com/kick/info](https://b3ck.com/kick/info)) —
see [Kick notes](#kick-notes). Messages stream in, color-coded per platform; the keyword bar and
spike banner update live.

## How it works

| Area | Notes |
| --- | --- |
| **Twitch** | Anonymous IRC over `wss://irc-ws.chat.twitch.tv:443` (`justinfan` nick, no token). Raw WebSockets aren't CORS-bound, so it connects straight from the browser. |
| **Kick** | Unofficial Pusher WebSocket (`chatrooms.<id>.v2`). Adding a Kick feed **requires** the numeric **chatroom ID**, entered next to the channel slug (find it at [b3ck.com/kick/info](https://b3ck.com/kick/info)). An auto-lookup via a Vite **dev proxy** (`/kick-api`) exists for env-configured defaults, but Cloudflare usually blocks it — see [Kick notes](#kick-notes). |
| **X** | Paid v2 API, CORS-blocked, token can't ship to the browser → an intentional **no-op stub** gated by `VITE_X_ENABLED`. Even with `VITE_X_ENABLED=true` it emits **no messages** — a silent X feed is expected, not a bug. Wire a server-side proxy to make it live. |
| **Engine** | `src/lib/keywordEngine.js` — rolling window of tokenized messages, stopword filtering, frequency ranking, baseline-ratio spike detection. Tunables in `src/lib/constants.js`. |
| **Feed** | `react-virtuoso` virtualized list with stick-to-bottom (`followOutput`). Messages are capped at `MAX_MESSAGES` to bound memory. |

### Configuration (`.env`)

Only `VITE_`-prefixed vars reach the browser — **never put real secrets here.**

```
VITE_X_ENABLED=false
VITE_X_BEARER_TOKEN=                       # placeholder only (stub)
VITE_DEFAULT_CHANNELS=twitch:xqc,kick:trainwreckstv
```

`.env.example` ships `placeholder` channels that are filtered out at startup, so nothing connects
until you set real ones (above). Note Kick entries here go through the auto-lookup (often
Cloudflare-blocked); the reliable way to add Kick is from the UI with its chatroom ID.

### Tunable engine constants (`src/lib/constants.js`)

`WINDOW_MS` (60s current window) · `BASELINE_MS` (5min baseline) · `SPIKE_RATIO` (3×) ·
`MIN_SPIKE_COUNT` · `MIN_SPIKE_SOURCES` (2) · `TOP_N` · `MAX_MESSAGES`. Stopwords live in
`src/lib/stopwords.js`; the sentiment word lists in `src/lib/sentimentLexicon.js`.

### Kick notes

Kick has no official public chat API; this uses a reverse-engineered Pusher endpoint and app key
(`32cbd69e4b950bf97679`) that **may rotate**. If Kick chat stops arriving, open DevTools →
Network → WS, filter `pusher`, and update the key in `src/connectors/kick.js`.

Adding a Kick feed from the UI **requires** the numeric **chatroom ID** — find it at
[b3ck.com/kick/info](https://b3ck.com/kick/info) and enter it next to the channel slug. An
auto-lookup via the `/kick-api` dev proxy exists for env-configured defaults, but Cloudflare
usually 403s it (TLS fingerprinting), so the manual ID is the reliable path. The dev proxy is
**dev-only**; production needs a real backend proxy.

## Scripts

```bash
npm run dev       # dev server (includes the /kick-api proxy)
npm run build     # production build
npm run preview   # preview the build (no dev proxy — Kick lookup needs a manual ID)
npm run lint
```
