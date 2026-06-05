import { useFeeds } from '../hooks/useStore.js'
import { store } from '../lib/chatStore.js'
import { sourceColor, sourceLabel } from '../config.js'

const STATUS_COLORS = {
  open: '#3fb950',
  connecting: '#d29922',
  reconnecting: '#d29922',
  'lookup-failed': '#f85149',
  error: '#f85149',
  closed: '#6e7681',
  disabled: '#6e7681',
}

// Active feeds with a per-feed status dot and a remove button. Each pill is also a click-to-filter
// control: clicking it shows only that channel's messages; the "All" chip returns to the merged
// view. Filtering affects DISPLAY ONLY — the engine/trending/spike/Chat Mood keep analyzing every
// message regardless. A Kick "lookup-failed" feed shows a hint to re-add with a manual chatroom ID.
export function FeedList({ activeFilter, onFilter }) {
  const feeds = useFeeds()
  if (feeds.length === 0) return null

  return (
    <div className="feed-list-bar" data-filtered={activeFilter != null} role="group" aria-label="filter chat by channel">
      <button
        className={`feed-all${activeFilter == null ? ' is-active' : ''}`}
        onClick={() => onFilter(null)}
        aria-pressed={activeFilter == null}
        title="Show all channels (merged)"
      >
        All
      </button>
      {feeds.map((f) => {
        const active = activeFilter === f.key
        return (
          <span
            key={f.key}
            className={`feed-pill${active ? ' is-active' : ''}`}
            style={{ borderColor: sourceColor(f.source) }}
          >
            <button
              className="feed-pill-btn"
              onClick={() => onFilter(active ? null : f.key)}
              aria-pressed={active}
              title={`Show only ${sourceLabel(f.source)} · ${f.channel}`}
            >
              <span
                className="feed-dot"
                style={{ backgroundColor: STATUS_COLORS[f.status] || '#6e7681' }}
                title={f.status + (f.detail ? `: ${f.detail}` : '')}
              />
              <span className="feed-name" style={{ color: sourceColor(f.source) }}>
                {sourceLabel(f.source)}
              </span>
              <span className="feed-chan">{f.channel}</span>
            </button>
            {f.status === 'lookup-failed' && (
              <span className="feed-warn" title={f.detail}>
                ⚠ needs chatroom ID
              </span>
            )}
            <button
              className="feed-remove"
              onClick={() => {
                store.removeFeed(f.key)
                if (active) onFilter(null) // don't leave a filter pointing at a removed feed
              }}
              aria-label={`remove ${f.key}`}
            >
              ×
            </button>
          </span>
        )
      })}
    </div>
  )
}
