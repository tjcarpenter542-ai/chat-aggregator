import { CONNECTORS } from '../connectors/index.js'
import { createEngine } from './keywordEngine.js'
import { MAX_MESSAGES, FLUSH_MS, TICK_MS } from './constants.js'

// Module-level store (a singleton). Holds the capped, timestamp-sorted message list, per-feed
// statuses, and the latest engine snapshot. Connectors push messages in via `ingest`; we
// batch-flush to subscribers every FLUSH_MS to avoid a React render per message under load.
// Exposed via useSyncExternalStore (see hooks/useStore.js).
function createStore() {
  let messages = [] // sorted by timestamp asc, capped to MAX_MESSAGES
  let pending = [] // incoming buffer, flushed every FLUSH_MS
  let snapshot = { keywords: [], sentiment: 0, spikes: [], bannerSpike: null, total: 0 }
  let subCount = 0 // session sub-event counter (NOT reset by clear())
  let subEvents = [] // session roster of normalized sub events; the SubCounter panel reads this
  let subEventsView = subEvents // stable reference between sub events (for useSyncExternalStore)
  let messageSeq = 0 // monotonic count of every message ingested — powers the paused "N new"
  // counter, which must stay accurate even after the cap evicts rows (a list-length delta can't).

  const feeds = new Map() // key "source:channel" -> { source, channel, status, detail, connector }
  let feedsView = [] // immutable projection of `feeds` for getFeeds()
  let messagesView = messages // stable reference between flushes

  const engine = createEngine()
  const subscribers = new Set()
  const notify = () => {
    for (const fn of subscribers) fn()
  }

  function rebuildFeedsView() {
    feedsView = [...feeds.values()].map(({ source, channel, status, detail }) => ({
      key: `${source}:${channel}`,
      source,
      channel,
      status,
      detail,
    }))
  }

  // Insert keeping ascending timestamp order. Fast-path append (messages almost always arrive
  // newest-last); otherwise binary-search the insertion point.
  function insertSorted(arr, msg) {
    if (arr.length === 0 || msg.timestamp >= arr[arr.length - 1].timestamp) {
      arr.push(msg)
      return
    }
    let lo = 0
    let hi = arr.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (arr[mid].timestamp <= msg.timestamp) lo = mid + 1
      else hi = mid
    }
    arr.splice(lo, 0, msg)
  }

  function flush() {
    if (pending.length === 0) return
    const batch = pending
    pending = []
    const next = messages.slice()
    for (const m of batch) insertSorted(next, m)
    if (next.length > MAX_MESSAGES) next.splice(0, next.length - MAX_MESSAGES)
    messages = next
    messagesView = messages
    notify()
  }

  function ingest(msg) {
    messageSeq += 1
    pending.push(msg)
    if (msg.type === 'sub') {
      subCount += 1 // surfaced via getSubCount; propagated on the next flush notify
      // New array ref so getSubEvents reports a change; subs are rare, so the O(n) copy is fine.
      subEvents = subEvents.concat(msg)
      subEventsView = subEvents
    } else {
      engine.addMessage(msg) // only chat feeds the keyword/sentiment engine
    }
  }

  // Reset the feed + engine to a true clean slate. Active feeds stay connected; the session
  // sub counter is intentionally preserved.
  function clear() {
    messages = []
    messagesView = messages
    pending = []
    engine.reset()
    snapshot = { keywords: [], sentiment: 0, spikes: [], bannerSpike: null, total: 0 }
    notify()
  }

  function addFeed({ source, channel, chatroomId } = {}) {
    const factory = CONNECTORS[source]
    if (!factory) return { ok: false, error: `Unknown source: ${source}` }
    const chan = typeof channel === 'string' ? channel.trim() : ''
    if (!chan) return { ok: false, error: 'Channel is required' }
    const key = `${source}:${chan}`
    if (feeds.has(key)) return { ok: false, error: 'Feed already added' }

    const entry = { source, channel: chan, status: 'connecting', detail: '', connector: null }
    feeds.set(key, entry)
    rebuildFeedsView()
    notify()

    entry.connector = factory({
      channel: chan,
      chatroomId,
      onMessage: ingest,
      onStatus: (status, detail = '') => {
        const e = feeds.get(key)
        if (!e) return
        e.status = status
        e.detail = detail
        rebuildFeedsView()
        notify()
      },
    })
    return { ok: true, key }
  }

  function removeFeed(key) {
    const entry = feeds.get(key)
    if (!entry) return
    try {
      entry.connector?.close()
    } catch {
      /* ignore */
    }
    feeds.delete(key)
    rebuildFeedsView()
    notify()
  }

  // Batched flush of incoming messages -> React.
  setInterval(flush, FLUSH_MS)

  // Engine tick: age out old records, recompute the one snapshot both views read, publish.
  setInterval(() => {
    const now = Date.now()
    engine.tick(now)
    snapshot = engine.snapshot(now)
    notify()
  }, TICK_MS)

  return {
    subscribe(fn) {
      subscribers.add(fn)
      return () => subscribers.delete(fn)
    },
    getMessages: () => messagesView,
    getFeeds: () => feedsView,
    getSnapshot: () => snapshot,
    getSubCount: () => subCount,
    getSubEvents: () => subEventsView,
    getMessageSeq: () => messageSeq,
    addFeed,
    removeFeed,
    clear,
  }
}

export const store = createStore()
