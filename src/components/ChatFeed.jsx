import { useRef, useState, useCallback } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { useMessages } from '../hooks/useStore.js'
import { MessageRow } from './MessageRow.jsx'

// Virtualized, timestamp-sorted feed. `followOutput` sticks to the bottom only when the user
// is already at the bottom (returns false otherwise, so it won't yank the view while reading
// scrollback). A "jump to latest" button appears when scrolled up. `filter` (a "source:channel"
// feed key, or null) narrows what's SHOWN only — the engine still analyzes every message.
export function ChatFeed({ filter = null }) {
  const all = useMessages()
  const messages = filter ? all.filter((m) => `${m.source}:${m.channel}` === filter) : all
  const ref = useRef(null)
  const [atBottom, setAtBottom] = useState(true)

  const itemContent = useCallback((_index, msg) => <MessageRow msg={msg} />, [])

  const jumpToLatest = () => {
    ref.current?.scrollToIndex({ index: messages.length - 1, behavior: 'smooth', align: 'end' })
  }

  return (
    <div className="feed">
      {messages.length === 0 ? (
        <div className="feed-empty">
          {filter
            ? 'No messages from this channel yet.'
            : 'No messages yet. Add a channel above to start aggregating chat.'}
        </div>
      ) : (
        <Virtuoso
          ref={ref}
          style={{ height: '100%' }}
          data={messages}
          computeItemKey={(_index, msg) => msg.id}
          itemContent={itemContent}
          followOutput={(isAtBottom) => (isAtBottom ? 'smooth' : false)}
          atBottomStateChange={setAtBottom}
          atBottomThreshold={48}
          initialTopMostItemIndex={Math.max(0, messages.length - 1)}
        />
      )}
      {!atBottom && messages.length > 0 && (
        <button className="jump-btn" onClick={jumpToLatest}>
          ↓ Jump to latest
        </button>
      )}
    </div>
  )
}
