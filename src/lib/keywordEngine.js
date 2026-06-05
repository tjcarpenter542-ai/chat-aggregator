import { STOPWORDS } from './stopwords.js'
import { POSITIVE_WORDS, NEGATIVE_WORDS } from './sentimentLexicon.js'
import {
  WINDOW_MS,
  BASELINE_MS,
  SPIKE_RATIO,
  MIN_SPIKE_COUNT,
  MIN_SPIKE_SOURCES,
  SPIKE_BANNER_MS,
  TOP_N,
  MIN_TOKEN_LEN,
} from './constants.js'

const TOKEN_RE = /[a-z0-9']+/g
// Cashtags like $BTC, $SOL, $ZEC — captured BEFORE punctuation stripping and kept UPPERCASE.
const CASHTAG_RE = /\$[A-Za-z]{1,6}\b/g
// Emoji — matched as whole sequences so skin-tone modifiers, variation selectors, ZWJ sequences
// (e.g. 👨‍👩‍👧), regional-indicator flags (🇺🇸) and keycaps (1️⃣) each count as ONE trending token.
// Captured BEFORE word tokenization because emojis aren't word chars and would otherwise be
// dropped. The `u` flag is required for \p{Extended_Pictographic} and astral-plane codepoints.
const EMOJI_RE =
  /[\u{1F1E6}-\u{1F1FF}]{2}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|[\u{1F3FB}-\u{1F3FF}])?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|[\u{1F3FB}-\u{1F3FF}])?)*/gu
// Token-level emoji check (no `g` flag, so repeated .test() stays stateless).
const EMOJI_DETECT_RE = /[\u{1F1E6}-\u{1F1FF}]|\p{Extended_Pictographic}|\u20E3/u
const isEmoji = (t) => EMOJI_DETECT_RE.test(t)

// Tokenize a chat message into cleaned candidate tokens. Stopword filtering is applied LATER
// (at count time) so sentiment can still see common words like "lol"/"wtf".
export function tokenize(text) {
  if (!text) return []
  const out = []
  // 1) Cashtags first, before punctuation stripping; preserve as uppercase "$SYMBOL" and
  //    remove from the text so they aren't double-counted as a plain lowercase word.
  let stripped = String(text).replace(CASHTAG_RE, (m) => {
    out.push('$' + m.slice(1).toUpperCase())
    return ' '
  })
  // 2) Emojis next (also before the word step): preserve each as its own token — emoji spam is a
  //    real "whole chat reacted" signal — and blank it out so the word matcher never sees it.
  stripped = stripped.replace(EMOJI_RE, (m) => {
    out.push(m)
    return ' '
  })
  // 3) Normal tokens: lowercase, drop <2 chars. Pure numbers ARE kept — chat numbers like
  //    "100" / "1000" / "140k" should trend (timestamps are a separate field, never tokenized).
  const matches = stripped.toLowerCase().match(TOKEN_RE)
  if (matches) {
    for (let t of matches) {
      t = t.replace(/^'+|'+$/g, '') // trim stray apostrophes
      if (t.length < 2) continue
      out.push(t)
    }
  }
  return out
}

// Cashtags ($...), numbers, and emojis always count and are never stopwords / length-filtered;
// other tokens must clear the length floor and not be a stopword. The word check sits first so
// most tokens never touch the number/emoji tests. A "number token" is anything starting with a
// digit ("100", "1000", "50x", "140k") — chat figures trend like words.
const isNumberToken = (t) => /^\d/.test(t)
const isKeyword = (t) =>
  t.startsWith('$') ||
  (t.length >= MIN_TOKEN_LEN && !STOPWORDS.has(t)) ||
  isNumberToken(t) ||
  isEmoji(t)

// One rolling-window engine. addMessage() feeds it; snapshot() returns BOTH the
// trending-words/sentiment view AND the cross-platform spikes — computed once, read twice.
export function createEngine() {
  // records: { ts, source, tokens: string[] }, retained for up to BASELINE_MS.
  let records = []
  // previous snapshot's current-window counts, for detecting which words climbed.
  let prevKeywordCounts = new Map()
  // latched top spike for the banner: { spike, expiresAt }. Held so a one-tick spike stays
  // on screen for SPIKE_BANNER_MS instead of flickering away on the next snapshot.
  let heldSpike = null

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

  // Wipe all retained messages — used by the "Clear" control for a true clean slate.
  function reset() {
    records = []
    prevKeywordCounts = new Map()
    heldSpike = null
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

      // Sentiment is deduped PER MESSAGE: a single "lol lol lol" counts once, so one spammer
      // can't skew the lean. Track which lexicon words this record already contributed.
      const posSeen = inCurrent ? new Set() : null
      const negSeen = inCurrent ? new Set() : null

      for (const t of rec.tokens) {
        if (inCurrent) {
          if (POSITIVE_WORDS.has(t)) posSeen.add(t)
          else if (NEGATIVE_WORDS.has(t)) negSeen.add(t)
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

      if (inCurrent) {
        pos += posSeen.size
        neg += negSeen.size
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
      // climbed vs the previous snapshot (incl. first appearance) -> the bar pulses it.
      climbing: count > (prevKeywordCounts.get(word) ?? 0),
    }))
    prevKeywordCounts = curCounts

    const sentiment = pos + neg === 0 ? 0 : (pos - neg) / (pos + neg)

    // --- View 2: cross-platform spikes (same data) ---
    const curSecs = WINDOW_MS / 1000
    const baseSecs = Math.max(1, (BASELINE_MS - WINDOW_MS) / 1000)
    const epsilonRate = 1 / baseSecs
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

    // Banner hold: keep the top spike available for SPIKE_BANNER_MS so a single-tick spike stays
    // readable. A live spike refreshes the hold (and a different word replaces it instantly);
    // once spikes subside the last one lingers until it expires. `more` = other concurrent spikes.
    const topSpike = spikes.length ? { ...spikes[0], more: spikes.length - 1 } : null
    if (topSpike) {
      heldSpike = { spike: topSpike, expiresAt: now + SPIKE_BANNER_MS }
    } else if (heldSpike && now >= heldSpike.expiresAt) {
      heldSpike = null
    }
    const bannerSpike = topSpike || (heldSpike ? heldSpike.spike : null)

    return { keywords, sentiment, spikes, bannerSpike, total: records.length }
  }

  return { addMessage, tick, snapshot, reset }
}
