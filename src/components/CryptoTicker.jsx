import { useEffect, useState } from 'react'

// Thin broadcast-style price ticker. Pulls CoinGecko's free public endpoint (no key) every
// REFRESH_MS, fails gracefully (keeps last good values, never throws/spams), and skips any coin
// missing from the response rather than breaking the whole row.
const COINS = [
  { id: 'bitcoin', sym: 'BTC' },
  { id: 'ethereum', sym: 'ETH' },
  { id: 'solana', sym: 'SOL' },
  { id: 'hyperliquid', sym: 'HYPE' },
  { id: 'zcash', sym: 'ZEC' },
]
const IDS = COINS.map((c) => c.id).join(',')
const URL = `https://api.coingecko.com/api/v3/simple/price?ids=${IDS}&vs_currencies=usd&include_24hr_change=true`
const REFRESH_MS = 30_000

function fmtPrice(p) {
  if (typeof p !== 'number') return '—'
  const max = p >= 1000 ? 0 : p >= 1 ? 2 : 4
  return '$' + p.toLocaleString('en-US', { maximumFractionDigits: max })
}
function fmtChange(c) {
  return `${c >= 0 ? '+' : ''}${c.toFixed(2)}%`
}

export function CryptoTicker() {
  const [prices, setPrices] = useState({}) // id -> { usd, change }

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await fetch(URL, { headers: { Accept: 'application/json' } })
        if (!res.ok) return // keep last good values on a bad response
        const data = await res.json()
        if (!alive || !data || typeof data !== 'object') return
        setPrices((prev) => {
          const next = { ...prev }
          for (const c of COINS) {
            const d = data[c.id]
            if (d && typeof d.usd === 'number') {
              next[c.id] = {
                usd: d.usd,
                change: typeof d.usd_24h_change === 'number' ? d.usd_24h_change : null,
              }
            }
            // coin missing from response -> leave prior value (skip), don't break the ticker
          }
          return next
        })
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

  return (
    <div className="ticker" aria-label="live crypto prices">
      <span className="ticker-label">Markets</span>
      <div className="ticker-items">
        {COINS.map((c) => {
          const p = prices[c.id]
          const change = p ? p.change : null
          const dir = change == null ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
          return (
            <span className={`ticker-item dir-${dir}`} key={c.id}>
              <span className="ticker-sym">{c.sym}</span>
              <span className="ticker-price">{p ? fmtPrice(p.usd) : '—'}</span>
              {change != null && (
                <span className="ticker-change">
                  {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '·'} {fmtChange(change)}
                </span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
