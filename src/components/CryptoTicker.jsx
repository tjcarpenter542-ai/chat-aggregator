import { useEffect, useState } from 'react'

// Scrolling ticker tape whose coin set is driven by what's TRENDING and MOVING, not just market
// cap. Built from CoinGecko's free public endpoints (no key):
//   - /search/trending           -> coins people are searching most (last 24h)
//   - /coins/markets (top 50)    -> top gainers + losers by 24h % change
//   - /simple/price (core)       -> guarantees the show's core coins always render
// Combined + deduped to ~20-30 coins. Refreshes slowly (these endpoints are heavier / rate-limited)
// and fails gracefully: keeps last good values on error, skips any coin missing data. The scroll is
// a pure CSS animation (see .ticker-track) — the tape always moves; only the numbers update here.
const CORE = [
  { id: 'bitcoin', sym: 'BTC' },
  { id: 'ethereum', sym: 'ETH' },
  { id: 'solana', sym: 'SOL' },
  { id: 'hyperliquid', sym: 'HYPE' },
  { id: 'zcash', sym: 'ZEC' },
]
const CORE_IDS = CORE.map((c) => c.id)
const MARKETS_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&price_change_percentage=24h'
const TRENDING_URL = 'https://api.coingecko.com/api/v3/search/trending'
const CORE_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${CORE_IDS.join(
  ',',
)}&vs_currencies=usd&include_24hr_change=true`
const REFRESH_MS = 50_000
const MAX_COINS = 28

function fmtPrice(p) {
  if (typeof p !== 'number' || !isFinite(p)) return '—'
  const max = p >= 1000 ? 0 : p >= 1 ? 2 : p >= 0.01 ? 4 : 6
  return '$' + p.toLocaleString('en-US', { maximumFractionDigits: max })
}
function fmtChange(c) {
  return `${c >= 0 ? '+' : ''}${c.toFixed(2)}%`
}

// Pure: merge the three responses into an ordered, deduped coin list with data.
function assemble(markets, trending, corePrices) {
  const data = new Map() // id -> { sym, price, change }
  const put = (id, sym, price, change) => {
    if (typeof price === 'number' && isFinite(price)) {
      data.set(id, { sym: String(sym || '').toUpperCase().slice(0, 10), price, change: typeof change === 'number' ? change : null })
    }
  }

  if (Array.isArray(markets)) {
    for (const m of markets) if (m?.id) put(m.id, m.symbol, m.current_price, m.price_change_percentage_24h)
  }

  const trendingIds = []
  if (Array.isArray(trending?.coins)) {
    for (const c of trending.coins) {
      const it = c?.item
      if (!it?.id) continue
      trendingIds.push(it.id)
      if (!data.has(it.id)) put(it.id, it.symbol, it.data?.price, it.data?.price_change_percentage_24h?.usd)
    }
  }

  // core last so simple/price is authoritative for the show's coins
  for (const c of CORE) {
    const d = corePrices?.[c.id]
    if (d) put(c.id, c.sym, d.usd, d.usd_24h_change)
  }

  const movers = Array.isArray(markets)
    ? markets.filter((m) => m?.id && typeof m.price_change_percentage_24h === 'number')
    : []
  const gainers = [...movers].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, 7).map((m) => m.id)
  const losers = [...movers].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 7).map((m) => m.id)

  const order = []
  const seen = new Set()
  for (const id of [...CORE_IDS, ...trendingIds.slice(0, 8), ...gainers, ...losers]) {
    if (seen.has(id) || !data.has(id)) continue
    seen.add(id)
    order.push(id)
    if (order.length >= MAX_COINS) break
  }
  return order.map((id) => ({ id, ...data.get(id) }))
}

export function CryptoTicker() {
  const [coins, setCoins] = useState([])

  useEffect(() => {
    let alive = true
    const safeJson = (settled) =>
      settled.status === 'fulfilled' && settled.value.ok ? settled.value.json().catch(() => null) : null
    const load = async () => {
      try {
        const opts = { headers: { Accept: 'application/json' } }
        const settled = await Promise.allSettled([
          fetch(MARKETS_URL, opts),
          fetch(TRENDING_URL, opts),
          fetch(CORE_URL, opts),
        ])
        const [markets, trending, corePrices] = await Promise.all(settled.map(safeJson))
        if (!alive) return
        const next = assemble(markets, trending, corePrices)
        if (next.length) setCoins(next) // keep last good values if everything failed
      } catch {
        // network/parse error -> keep last good values, no console spam
      }
    }
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  const item = (c, dupe) => {
    const dir = c.change == null ? 'flat' : c.change > 0 ? 'up' : c.change < 0 ? 'down' : 'flat'
    return (
      <span className={`ticker-item dir-${dir}`} key={dupe ? `${c.id}-d` : c.id} aria-hidden={dupe || undefined}>
        <span className="ticker-sym">{c.sym}</span>
        <span className="ticker-price">{fmtPrice(c.price)}</span>
        {c.change != null && (
          <span className="ticker-change">
            {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '·'} {fmtChange(c.change)}
          </span>
        )}
      </span>
    )
  }

  return (
    <div className="ticker" aria-label="live trending crypto prices">
      <span className="ticker-label">Markets</span>
      <div className="ticker-viewport">
        {coins.length === 0 ? (
          <span className="ticker-loading">loading live markets…</span>
        ) : (
          // Two identical copies so the CSS translateX(-50%) loop is seamless.
          <div className="ticker-track">
            {coins.map((c) => item(c, false))}
            {coins.map((c) => item(c, true))}
          </div>
        )}
      </div>
    </div>
  )
}
