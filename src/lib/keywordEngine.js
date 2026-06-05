import { STOPWORDS } from './stopwords.js'
import { POSITIVE_WORDS, NEGATIVE_WORDS } from './sentimentLexicon.js'
import {
  WINDOW_MS,
  BASELINE_MS,
  SPIKE_RATIO,
  MIN_SPIKE_COUNT,
  MIN_SPIKE_SOURCES,
  TOP_N,
  MIN_TOKEN_LEN,
} from './constants.js'

const TOKEN_RE = /[a-z0-9']+/g

// Tokenize a chat message into cleaned candidate tokens (length >= 2, not a pure number).
// Stopword filtering is applied LATER (at count time) so sentiment can still see common
// words like "lol"/"wtf" while the trending view ignores them.
export function tokenize(text) {
  if (!text) return []
  const matches = text.toLowerCase().match(TOKEN_RE)
  if (!matches) return []
  const out = []
  for (let t of matches) {
    t = t.replace(/^'+|'+$/g, '') // trim stray apostrophes
    if (t.length < 2) continue
    if (/^\d+$/.test(t)) continue
    out.push(t)
  }
  return out
}

// A token counts toward trending/spikes only if it's long enough and not a stopword.
const isKeyword = (t) => t.length >= MIN_TOKEN_LEN && !STOPWORDS.has(t)

// One rolling-window engine. addMessage() feeds it; snapshot() returns BOTH the
// trending-words/sentiment view AND the cross-platform spikes — computed once, read twice.
export function createEngine() {
  // records: { ts, source, tokens: string[] }, retained for up to BASELINE_MS.
  let records = []

  function addMessage(msg) {
    const tokens = tokenize(msg.message)
    if (tokens.length === 0) return
    records.push({ ts: msg.timestamp, source: msg.source, tokens })
  }

  // Drop records older than the baseline window. Call on each tick to bound memory.
  function tick(now) {
    const cutoff = now - BASELINE_MS
    if (records.length && records[0].ts < cutoff) {
      let i = 0
      while (i < records.length && records[i].ts < cutoff) i++
      records = records.slice(i)
    }
  }

  function snapshot(now) {
    const curStart = now - WINDOW_MS
    const baseStart = now - BASELINE_MS

    const curCounts = new Map() // word -> count in current window
    const curSources = new Map() // word -> Set(source) in current window
    const baseCounts = new Map() // word -> count in baseline window [baseStart, curStart)
    let pos = 0
    let neg = 0

    for (const rec of records) {
      const inCurrent = rec.ts >= curStart
      const inBaseline = !inCurrent && rec.ts >= baseStart
      if (!inCurrent && !inBaseline) continue
      for (const t of rec.tokens) {
        if (inCurrent) {
          // sentiment is computed over the current window, including stopword-ish words
          if (POSITIVE_WORDS.has(t)) pos++
          else if (NEGATIVE_WORDS.has(t)) neg++
        }
        if (!isKeyword(t)) continue
        if (inCurrent) {
          curCounts.set(t, (curCounts.get(t) || 0) + 1)
          let s = curSources.get(t)
          if (!s) {
            s = new Set()
            curSources.set(t, s)
          }
          s.add(rec.source)
        } else {
          baseCounts.set(t, (baseCounts.get(t) || 0) + 1)
        }
      }
    }

    // --- View 1: trending words (top-N by current count, weight normalized to the max) ---
    const sorted = [...curCounts.entries()].sort((a, b) => b[1] - a[1])
    const maxCount = sorted.length ? sorted[0][1] : 1
    const keywords = sorted.slice(0, TOP_N).map(([word, count]) => ({
      word,
      count,
      weight: count / maxCount,
      sources: [...(curSources.get(word) || [])],
    }))

    const sentiment = pos + neg === 0 ? 0 : (pos - neg) / (pos + neg)

    // --- View 2: cross-platform spikes (same data) ---
    // Compare the word's current rate to its baseline rate. Must clear the ratio AND a
    // minimum absolute count AND appear in >= MIN_SPIKE_SOURCES distinct platforms.
    const curSecs = WINDOW_MS / 1000
    const baseSecs = Math.max(1, (BASELINE_MS - WINDOW_MS) / 1000)
    const epsilonRate = 1 / baseSecs // treat "never seen in baseline" as ~1 occurrence
    const spikes = []
    for (const [word, count] of curCounts) {
      if (count < MIN_SPIKE_COUNT) continue
      const sources = curSources.get(word) || new Set()
      if (sources.size < MIN_SPIKE_SOURCES) continue
      const curRate = count / curSecs
      const baseRate = (baseCounts.get(word) || 0) / baseSecs
      const ratio = curRate / Math.max(baseRate, epsilonRate)
      if (ratio >= SPIKE_RATIO) {
        spikes.push({ word, count, ratio, sources: [...sources] })
      }
    }
    spikes.sort((a, b) => b.ratio - a.ratio)

    return { keywords, sentiment, spikes, total: records.length }
  }

  return { addMessage, tick, snapshot }
}
