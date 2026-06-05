import { useRef, useState, useCallback } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { useMessages } from '../hooks/useStore.js'
import { MessageRow } from './MessageRow.jsx'

// Virtualized, timestamp-sorted feed. `followOutput` sticks to the bottom only when the user is
// already at the bottom. HOVERING the feed pauses auto-scroll so you can read without messages
// scrolling away; leaving resumes and snaps back to the latest. Messages keep arriving and the
// engine keeps analyzing while paused — only the auto-scroll is held, not ingestion. A "jump to
// latest" button appears when scrolled up. `filter` (a "source:channel" feed key, or null) narrows
// what's SHOWN only.
export function ChatFeed({ filter = null }) {
  const all = useMessages()
  const messages = filter ? all.filter((m) => `${m.source}:${m.channel}` === filter) : all
  const ref = useRef(null)
  const [atBottom, setAtBottom] = useState(true)
  const [hovering, setHovering] = useState(false)
  const [hoverBase, setHoverBase] = useState(0) // message count when the hover (pause) started

  const itemContent = useCallback((_index, msg) => <MessageRow msg={msg} />, [])

  const jumpToLatest = () => {
    if (messages.length) {
      ref.current?.scrollToIndex({ index: messages.length - 1, behavior: 'smooth', align: 'end' })
    }
  }

  const onEnter = () => {
    setHoverBase(messages.length)
    setHovering(true)
  }
  const onLeave = () => {
    setHovering(false)
    jumpToLatest() // resume following + snap to the latest message
  }

  const newWhilePaused = hovering ? Math.max(0, messages.length - hoverBase) : 0

  return (
    <div className="feed" onMouseEnter={onEnter} onMouseLeave={onLeave}>
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
          // Paused while hovering: never auto-scroll on new messages, regardless of position.
          followOutput={(isAtBottom) => (hovering ? false : isAtBottom ? 'smooth' : false)}
          atBottomStateChange={setAtBottom}
          atBottomThreshold={48}
          initialTopMostItemIndex={Math.max(0, messages.length - 1)}
        />
      )}
      {hovering && messages.length > 0 && (
        <div className="feed-pause" role="status">
          <span className="feed-pause-icon">⏸</span>
          {newWhilePaused > 0
            ? `${newWhilePaused} new — move mouse away to resume`
            : 'Paused — move mouse away to resume'}
        </div>
      )}
      {!atBottom && messages.length > 0 && (
        <button className="jump-btn" onClick={jumpToLatest}>
          ↓ Jump to latest
        </button>
      )}
    </div>
  )
}
