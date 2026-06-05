import { useRef, useState, useCallback } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { useMessages, useMessageSeq } from '../hooks/useStore.js'
import { MessageRow } from './MessageRow.jsx'

// Virtualized, timestamp-sorted feed with hover-to-pause that HOLDS under high-volume chat.
//
// The naive "pause auto-scroll" isn't enough at hundreds of msgs/sec: the underlying list keeps
// appending and the cap keeps evicting, so rows move and disappear under the reader even while
// "paused". Fix: while hovering, render a FROZEN SNAPSHOT of the list captured at hover-start and
// keep rendering exactly that — no appends, no evictions — so what you're reading stays put no
// matter how fast chat moves. (The store builds a NEW array on every flush and never mutates the
// one we captured, so holding that reference truly freezes it.) New messages keep flowing into the
// engine (trending/spikes/Chat Mood keep analyzing everything) and accumulate in the store; they
// just don't touch the displayed feed until un-hover, when we switch back to the live merged list
// and snap to the latest. The "N new" pill counts the store's monotonic message counter delta, so
// it stays correct even after the cap has evicted everything from before the pause.
export function ChatFeed({ filter = null }) {
  const all = useMessages()
  const seq = useMessageSeq()
  const live = filter ? all.filter((m) => `${m.source}:${m.channel}` === filter) : all
  const ref = useRef(null)
  const [atBottom, setAtBottom] = useState(true)
  const [hovering, setHovering] = useState(false)
  const [frozen, setFrozen] = useState(null) // snapshot of the displayed list while paused
  const [baseSeq, setBaseSeq] = useState(0) // store message counter at pause start

  // While hovering, display the frozen snapshot; otherwise the live (merged) list.
  const display = hovering && frozen ? frozen : live

  const itemContent = useCallback((_index, msg) => <MessageRow msg={msg} />, [])

  const snapToLatest = () =>
    ref.current?.scrollToIndex({ index: 'LAST', behavior: 'smooth', align: 'end' })

  const onEnter = () => {
    setFrozen(live) // freeze exactly what's on screen right now
    setBaseSeq(seq)
    setHovering(true)
  }
  const onLeave = () => {
    setHovering(false)
    setFrozen(null)
    // After the display switches back to the live list (next commit), snap to the newest message.
    setTimeout(snapToLatest, 0)
  }

  // Messages ingested since the pause began (the background buffer). Monotonic counter delta, so
  // it's accurate even when the cap has evicted every pre-pause row.
  const newWhilePaused = hovering ? Math.max(0, seq - baseSeq) : 0

  return (
    <div className="feed" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {display.length === 0 ? (
        <div className="feed-empty">
          {filter
            ? 'No messages from this channel yet.'
            : 'No messages yet. Add a channel above to start aggregating chat.'}
        </div>
      ) : (
        <Virtuoso
          ref={ref}
          style={{ height: '100%' }}
          data={display}
          computeItemKey={(_index, msg) => msg.id}
          itemContent={itemContent}
          // Paused while hovering: never auto-scroll (frozen data doesn't change anyway). When live,
          // follow with 'auto' (instant) not 'smooth' — at hundreds of msgs/sec a smooth animation
          // lags dozens of rows behind, so freezing mid-animation would let the view drift. Instant
          // follow keeps the view pinned at the true bottom, so the freeze holds exactly in place.
          followOutput={(isAtBottom) => (hovering ? false : isAtBottom ? 'auto' : false)}
          atBottomStateChange={setAtBottom}
          atBottomThreshold={48}
          initialTopMostItemIndex={Math.max(0, display.length - 1)}
        />
      )}
      {hovering && display.length > 0 && (
        <div className="feed-pause" role="status">
          <span className="feed-pause-icon">⏸</span>
          {newWhilePaused > 0
            ? `${newWhilePaused} new — move mouse away to resume`
            : 'Paused — move mouse away to resume'}
        </div>
      )}
      {!atBottom && display.length > 0 && (
        <button className="jump-btn" onClick={snapToLatest}>
          ↓ Jump to latest
        </button>
      )}
    </div>
  )
}
