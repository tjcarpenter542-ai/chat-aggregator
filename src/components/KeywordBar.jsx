import { useEngineSnapshot } from '../hooks/useStore.js'
import { categorize, CATEGORY_COLORS, LEGEND_CATEGORIES } from '../lib/keywordCategories.js'

const MIN_FONT = 0.85
const MAX_FONT = 1.5 // cap so a runaway word can't blow up the row

// Map a normalized frequency weight (0..1] to a capped font size.
function fontSize(weight) {
  return `${(MIN_FONT + weight * (MAX_FONT - MIN_FONT)).toFixed(3)}rem`
}

// View 1 of the engine snapshot: trending words (sized by frequency, colored by category) +
// a sentiment lean meter, plus a category legend. Words pulse when their count climbs (the
// engine flags `climbing` per keyword by comparing to the previous snapshot).
export function KeywordBar() {
  const { keywords, sentiment } = useEngineSnapshot()

  const lean = Math.round(sentiment * 100)
  const mood = lean > 5 ? 'Positive' : lean < -5 ? 'Negative' : 'Neutral'
  const hue = Math.round((sentiment + 1) * 60) // -1 -> 0 (red), +1 -> 120 (green)

  return (
    <div className="keyword-bar">
      <div className="kw-row">
        <div className="kw-words">
          {keywords.length === 0 ? (
            <span className="kw-empty">trending words will appear here…</span>
          ) : (
            keywords.map((k) => {
              const category = categorize(k.word)
              return (
                <span
                  // count in the key remounts the chip when it changes, replaying the pulse.
                  key={`${k.word}-${k.count}`}
                  className={`kw-chip${k.climbing ? ' climbing' : ''}`}
                  style={{ fontSize: fontSize(k.weight), color: CATEGORY_COLORS[category] }}
                  title={`${k.word} · ${k.count} · ${category}`}
                >
                  {k.word}
                  <span className="kw-count">{k.count}</span>
                </span>
              )
            })
          )}
        </div>
        <div className="kw-sentiment" title={`chat mood lean: ${lean}`}>
          <span className="kw-sent-label">Chat Mood: {mood}</span>
          <span className="kw-sent-meter">
            <span
              className="kw-sent-fill"
              style={{ width: `${Math.abs(lean)}%`, backgroundColor: `hsl(${hue}, 70%, 45%)` }}
            />
          </span>
        </div>
      </div>
      <div className="kw-legend">
        {LEGEND_CATEGORIES.map((cat) => (
          <span className="kw-legend-item" key={cat}>
            <span className="kw-legend-dot" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
            {cat}
          </span>
        ))}
      </div>
    </div>
  )
}
