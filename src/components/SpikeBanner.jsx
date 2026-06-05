import { useEngineSnapshot } from '../hooks/useStore.js'
import { sourceLabel } from '../config.js'

// View 2 of the engine snapshot: cross-platform spike alert. The engine latches the top spike
// into `bannerSpike` and holds it for ~SPIKE_BANNER_MS (or until a new spike replaces it), so the
// banner stays readable instead of vanishing the instant a one-tick spike subsides. This stays a
// pure view of the snapshot — the hold/expiry logic lives in keywordEngine.js.
export function SpikeBanner() {
  const { bannerSpike } = useEngineSnapshot()
  if (!bannerSpike) return null

  const where = bannerSpike.sources.map(sourceLabel).join(' + ')
  return (
    <div className="spike-banner" role="status">
      <span className="spike-flame">🔥</span>
      <span>
        <strong>&ldquo;{bannerSpike.word}&rdquo;</strong> is spiking across <strong>{where}</strong>
      </span>
      <span className="spike-meta">
        ×{bannerSpike.ratio.toFixed(1)} vs baseline · {bannerSpike.count} now
      </span>
      {bannerSpike.more > 0 && <span className="spike-more">+{bannerSpike.more} more</span>}
    </div>
  )
}
