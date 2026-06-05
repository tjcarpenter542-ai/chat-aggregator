import { useEngineSnapshot } from '../hooks/useStore.js'
import { sourceLabel } from '../config.js'

// View 2 of the engine snapshot: cross-platform spike alert. Renders only while a word is
// spiking in >= 2 sources; clears automatically on the next snapshot once the spike subsides.
export function SpikeBanner() {
  const { spikes } = useEngineSnapshot()
  if (!spikes || spikes.length === 0) return null

  const top = spikes[0]
  const where = top.sources.map(sourceLabel).join(' + ')
  return (
    <div className="spike-banner" role="status">
      <span className="spike-flame">🔥</span>
      <span>
        <strong>&ldquo;{top.word}&rdquo;</strong> is spiking across <strong>{where}</strong>
      </span>
      <span className="spike-meta">
        ×{top.ratio.toFixed(1)} vs baseline · {top.count} now
      </span>
      {spikes.length > 1 && <span className="spike-more">+{spikes.length - 1} more</span>}
    </div>
  )
}
