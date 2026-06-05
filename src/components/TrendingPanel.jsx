import { useEngineSnapshot } from '../hooks/useStore.js'
import { categorize, CATEGORY_COLORS, LEGEND_CATEGORIES } from '../lib/keywordCategories.js'

const MIN_FONT = 0.85
const MAX_FONT = 1.5 // cap so a runaway word can't blow up the row

// Map a normalized frequency weight (0..1] to a capped font size.
function fontSize(weight) {
  return `${(MIN_FONT + weight * (MAX_FONT - MIN_FONT)).toFixed(3)}rem`
}

// View 1 of the engine snapshot, as a vertical right rail: trending words stack top-to-bottom
// (natural mouse-wheel scroll, no horizontal scrollbar). Each word keeps its existing treatment —
// category color, count badge, climb pulse, and the MIN_FONT..MAX_FONT size cap. The category
// legend sits at the bottom of the panel.
export function TrendingPanel() {
  const { keywords } = useEngineSnapshot()

  return (
    <aside className="trending-panel">
      <div className="trending-head">
        <span className="trending-title">Trending</span>
        <span className="trending-sub">Most-used words &amp; emojis · live across all chats</span>
      </div>
      <div className="trending-words">
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
                <span className="kw-word">{k.word}</span>
                <span className="kw-count">{k.count}</span>
              </span>
            )
          })
        )}
      </div>
      <div className="kw-legend">
        {LEGEND_CATEGORIES.map((cat) => (
          <span className="kw-legend-item" key={cat}>
            <span className="kw-legend-dot" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
            {cat}
          </span>
        ))}
      </div>
    </aside>
  )
}
