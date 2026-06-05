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

// Active feeds with a per-feed status dot and a remove button. A Kick "lookup-failed" feed
// shows a hint to re-add with a manual chatroom ID.
export function FeedList() {
  const feeds = useFeeds()
  if (feeds.length === 0) return null

  return (
    <div className="feed-list-bar">
      {feeds.map((f) => (
        <span key={f.key} className="feed-pill" style={{ borderColor: sourceColor(f.source) }}>
          <span
            className="feed-dot"
            style={{ backgroundColor: STATUS_COLORS[f.status] || '#6e7681' }}
            title={f.status + (f.detail ? `: ${f.detail}` : '')}
          />
          <span className="feed-name" style={{ color: sourceColor(f.source) }}>
            {sourceLabel(f.source)}
          </span>
          <span className="feed-chan">{f.channel}</span>
          {f.status === 'lookup-failed' && (
            <span className="feed-warn" title={f.detail}>
              ⚠ needs chatroom ID
            </span>
          )}
          <button
            className="feed-remove"
            onClick={() => store.removeFeed(f.key)}
            aria-label={`remove ${f.key}`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )
}
