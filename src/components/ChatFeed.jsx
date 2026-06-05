import { useRef, useState, useCallback } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { useMessages } from '../hooks/useStore.js'
import { MessageRow } from './MessageRow.jsx'

// Virtualized, timestamp-sorted feed. `followOutput` sticks to the bottom only when the user
// is already at the bottom (returns false otherwise, so it won't yank the view while reading
// scrollback). A "jump to latest" button appears when scrolled up.
export function ChatFeed() {
  const messages = useMessages()
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
          No messages yet. Add a channel above to start aggregating chat.
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
