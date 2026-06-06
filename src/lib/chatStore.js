import { CONNECTORS } from '../connectors/index.js'
import { createEngine } from './keywordEngine.js'
import { MAX_MESSAGES, MAX_ROSTER, FLUSH_MS, TICK_MS } from './constants.js'

// Module-level store (a singleton). Holds the capped, timestamp-sorted message list, per-feed
// statuses, and the latest engine snapshot. Connectors push messages in via `ingest`; we
// batch-flush to subscribers every FLUSH_MS to avoid a React render per message under load.
// Exposed via useSyncExternalStore (see hooks/useStore.js).
function createStore() {
  let messages = [] // sorted by timestamp asc, capped to MAX_MESSAGES
  let pending = [] // incoming buffer, flushed every FLUSH_MS
  let snapshot = { keywords: [], sentiment: 0, spikes: [], bannerSpike: null, total: 0 }
  let subCount = 0 // session sub-event counter (the exact running total; reset by clear())
  let subEvents = [] // session roster of normalized sub events; the SubCounter panel reads this
  let subEventsView = subEvents // stable reference between sub events (for useSyncExternalStore)
  let messageSeq = 0 // monotonic count of every message ingested — powers the paused "N new"
  // counter, which must stay accurate even after the cap evicts rows (a list-length delta can't).
  let modEvents = [] // session roster of moderation actions (timeouts / bans / deletes)
  let modEventsView = modEvents
  let modCounts = {} // per-feed "source:channel" -> count of mod actions this session
  let modCountsView = modCounts
  // Live per-channel message activity, built ONLY from real messages flowing through the store
  // (no external/viewer APIs): a monotonic total + a smoothed messages-per-minute rate.
  const channelStats = new Map() // "source:channel" -> { total, lastTotal, rate }
  let channelStatsView = {} // plain { key: { total, rate } } for useSyncExternalStore

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
    if (msg.type === 'mod') {
      // Mod actions feed ONLY the moderation view — not the chat feed or the keyword engine. The
      // roster is capped (the exact per-channel totals live in modCounts, which stays uncapped).
      modEvents = modEvents.concat(msg)
      if (modEvents.length > MAX_ROSTER) modEvents = modEvents.slice(-MAX_ROSTER)
      modEventsView = modEvents
      const key = `${msg.source}:${msg.channel}`
      modCounts = { ...modCounts, [key]: (modCounts[key] || 0) + 1 }
      modCountsView = modCounts
      return
    }
    messageSeq += 1
    pending.push(msg)
    // Per-channel monotonic message total (drives the live rate; survives cap eviction).
    const ckey = `${msg.source}:${msg.channel}`
    let cs = channelStats.get(ckey)
    if (!cs) {
      cs = { total: 0, lastTotal: 0, rate: 0 }
      channelStats.set(ckey, cs)
    }
    cs.total += 1
    if (msg.type === 'sub') {
      subCount += 1 // exact running total (surfaced via getSubCount), independent of the capped roster
      // New array ref so getSubEvents reports a change; cap the roster tail so it can't grow forever.
      subEvents = subEvents.concat(msg)
      if (subEvents.length > MAX_ROSTER) subEvents = subEvents.slice(-MAX_ROSTER)
      subEventsView = subEvents
    } else {
      engine.addMessage(msg) // only chat feeds the keyword/sentiment engine
    }
  }

  // Reset the feed + engine to a true clean slate. Active feeds stay connected, but EVERYTHING
  // session-scoped is wiped — including the sub counter and roster (so Clear means a full reset).
  function clear() {
    messages = []
    messagesView = messages
    pending = []
    engine.reset()
    snapshot = { keywords: [], sentiment: 0, spikes: [], bannerSpike: null, total: 0 }
    subCount = 0
    subEvents = []
    subEventsView = subEvents // new reference so getSubEvents reports the change to the roster
    modEvents = []
    modEventsView = modEvents
    modCounts = {}
    modCountsView = modCounts
    channelStats.clear()
    channelStatsView = {}
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
    channelStats.delete(key)
    rebuildFeedsView()
    notify()
  }

  // Smoothed per-channel messages-per-minute from the monotonic per-channel totals. EMA over the
  // per-tick delta so the number is responsive but not jittery, and decays toward 0 when a chat
  // goes quiet. Rebuilt into a fresh view object each tick so subscribers see the live update.
  const RATE_ALPHA = 0.5
  function updateChannelRates() {
    const view = {}
    for (const [key, st] of channelStats) {
      const delta = st.total - st.lastTotal
      st.lastTotal = st.total
      const inst = delta * (60_000 / TICK_MS) // delta-per-tick -> per-minute
      st.rate = RATE_ALPHA * inst + (1 - RATE_ALPHA) * st.rate
      view[key] = { total: st.total, rate: st.rate }
    }
    channelStatsView = view
  }

  // Batched flush of incoming messages -> React.
  setInterval(flush, FLUSH_MS)

  // Engine tick: age out old records, recompute the one snapshot both views read, refresh the
  // per-channel rates, publish.
  setInterval(() => {
    const now = Date.now()
    engine.tick(now)
    snapshot = engine.snapshot(now)
    updateChannelRates()
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
    getModEvents: () => modEventsView,
    getModCounts: () => modCountsView,
    getChannelStats: () => channelStatsView,
    addFeed,
    removeFeed,
    clear,
  }
}

export const store = createStore()
