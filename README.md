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
cp .env.example .env   # optional — defaults work out of the box
npm run dev            # http://localhost:5173
```

Type a channel into the box (pick a source first) and hit **Add feed**. Messages stream in,
color-coded per platform; the keyword bar and spike banner update live.

## How it works

| Area | Notes |
| --- | --- |
| **Twitch** | Anonymous IRC over `wss://irc-ws.chat.twitch.tv:443` (`justinfan` nick, no token). Raw WebSockets aren't CORS-bound, so it connects straight from the browser. |
| **Kick** | Unofficial Pusher WebSocket (`chatrooms.<id>.v2`). The chatroom-id lookup hits Cloudflare/CORS, so it routes through a Vite **dev proxy** (`/kick-api`). If that's blocked, paste a chatroom ID into the optional field — see [Kick notes](#kick-notes). |
| **X** | Paid v2 API, CORS-blocked, token can't ship to the browser → a **no-op stub** gated by `VITE_X_ENABLED`. Wire a server-side proxy to make it live. |
| **Engine** | `src/lib/keywordEngine.js` — rolling window of tokenized messages, stopword filtering, frequency ranking, baseline-ratio spike detection. Tunables in `src/lib/constants.js`. |
| **Feed** | `react-virtuoso` virtualized list with stick-to-bottom (`followOutput`). Messages are capped at `MAX_MESSAGES` to bound memory. |

### Configuration (`.env`)

Only `VITE_`-prefixed vars reach the browser — **never put real secrets here.**

```
VITE_X_ENABLED=false
VITE_X_BEARER_TOKEN=                       # placeholder only (stub)
VITE_DEFAULT_CHANNELS=twitch:xqc,kick:trainwreckstv
```

### Tunable engine constants (`src/lib/constants.js`)

`WINDOW_MS` (60s current window) · `BASELINE_MS` (5min baseline) · `SPIKE_RATIO` (3×) ·
`MIN_SPIKE_COUNT` · `MIN_SPIKE_SOURCES` (2) · `TOP_N` · `MAX_MESSAGES`. Stopwords live in
`src/lib/stopwords.js`; the sentiment word lists in `src/lib/sentimentLexicon.js`.

### Kick notes

Kick has no official public chat API; this uses a reverse-engineered Pusher endpoint and app key
(`32cbd69e4b950bf97679`) that **may rotate**. If Kick chat stops arriving, open DevTools →
Network → WS, filter `pusher`, and update the key in `src/connectors/kick.js`. The chatroom-id
lookup can be 403'd by Cloudflare even through the proxy — when that happens the feed shows
"needs chatroom ID"; re-add it with the numeric chatroom ID in the optional field. The dev proxy
is **dev-only**; production needs a real backend proxy.

## Scripts

```bash
npm run dev       # dev server (includes the /kick-api proxy)
npm run build     # production build
npm run preview   # preview the build (no dev proxy — Kick lookup needs a manual ID)
npm run lint
```
