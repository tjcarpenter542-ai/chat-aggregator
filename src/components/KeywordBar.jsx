import { useEngineSnapshot } from '../hooks/useStore.js'

// Map a normalized frequency weight (0..1] to a font size so hotter words look bigger.
function fontSize(weight) {
  return `${0.8 + weight * 1.0}rem`
}

// View 1 of the engine snapshot: trending words (sized by frequency) + a sentiment lean meter.
export function KeywordBar() {
  const { keywords, sentiment } = useEngineSnapshot()
  const lean = Math.round(sentiment * 100)
  const leanLabel = lean > 5 ? 'positive' : lean < -5 ? 'negative' : 'neutral'
  const hue = Math.round((sentiment + 1) * 60) // -1 -> 0 (red), +1 -> 120 (green)

  return (
    <div className="keyword-bar">
      <div className="kw-words">
        {keywords.length === 0 ? (
          <span className="kw-empty">trending words will appear here…</span>
        ) : (
          keywords.map((k) => (
            <span
              key={k.word}
              className="kw-chip"
              style={{ fontSize: fontSize(k.weight) }}
              title={`${k.count} mentions · ${k.sources.join(', ')}`}
            >
              {k.word}
              <span className="kw-count">{k.count}</span>
            </span>
          ))
        )}
      </div>
      <div className="kw-sentiment" title={`sentiment lean: ${lean}`}>
        <span className="kw-sent-label">{leanLabel}</span>
        <span className="kw-sent-meter">
          <span
            className="kw-sent-fill"
            style={{ width: `${Math.abs(lean)}%`, backgroundColor: `hsl(${hue}, 70%, 45%)` }}
          />
        </span>
      </div>
    </div>
  )
}
