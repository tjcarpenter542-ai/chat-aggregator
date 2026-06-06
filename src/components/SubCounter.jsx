import { useEffect, useRef, useState } from 'react'
import { useSubCount, useSubEvents } from '../hooks/useStore.js'
import { useAvoidVideoOverlap } from '../hooks/useAvoidVideoOverlap.js'
import { sourceColor, sourceLabel } from '../config.js'

// Compact per-sub detail line from the normalized sub metadata. Falls back gracefully when a
// platform sends sparse data (Kick sub payloads are undocumented and vary).
function subDetail(sub) {
  if (!sub) return 'subscribed'
  if (sub.giftCount) {
    // Kick mass gift (one event carrying the batch count).
    const n = Number(sub.giftCount) || sub.giftCount
    return `🎁 gifted ${n} sub${Number(n) > 1 ? 's' : ''}`
  }
  if (sub.gifter || sub.msgId === 'subgift') {
    // Twitch gift sub: this row IS the recipient (the new subscriber); credit the gifter here.
    return sub.gifter ? `🎁 gift from ${sub.gifter}` : '🎁 gift sub'
  }
  if (sub.months) {
    const m = Number(sub.months) || sub.months
    return `${m} month${Number(m) > 1 ? 's' : ''}`
  }
  return 'subscribed'
}

// Session sub-event counter in the header. Flashes when the count goes up, and is a button:
// clicking it opens a roster panel listing every sub this session (newest first), each with a
// platform badge, username, and sub detail.
export function SubCounter() {
  const subs = useSubCount()
  const events = useSubEvents()
  const prev = useRef(subs)
  const [flash, setFlash] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const panelRef = useRef(null)
  // Never let this panel's box overlap the video iframe (Twitch rebuffers if anything paints over it).
  useAvoidVideoOverlap(panelRef, open)

  useEffect(() => {
    if (subs > prev.current) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 900)
      prev.current = subs
      return () => clearTimeout(t)
    }
    prev.current = subs
  }, [subs])

  // Close the panel on outside-click or Escape while it's open.
  useEffect(() => {
    if (!open) return
    const onPointer = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="sub-counter-wrap" ref={wrapRef}>
      <button
        className={`sub-counter${flash ? ' flash' : ''}`}
        title="subs this session — click for the roster"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        🎉 {subs} sub{subs === 1 ? '' : 's'}
      </button>
      {open && (
        <div className="sub-panel" role="dialog" aria-label="Subscribers this session" ref={panelRef}>
          <div className="sub-panel-head">
            <span>Subs this session</span>
            <span className="sub-panel-count">{subs}</span>
          </div>
          {events.length === 0 ? (
            <div className="sub-panel-empty">No subs yet this session.</div>
          ) : (
            <ul className="sub-panel-list">
              {events
                .slice(-100)
                .reverse()
                .map((e) => (
                  <li key={e.id} className="sub-panel-item">
                    <span
                      className="sub-panel-badge"
                      style={{ backgroundColor: sourceColor(e.source) }}
                    >
                      {sourceLabel(e.source)}
                    </span>
                    {e.channel && (
                      <span className="sub-panel-chan" style={{ color: sourceColor(e.source) }}>
                        {e.channel}
                      </span>
                    )}
                    <span className="sub-panel-user" style={{ color: sourceColor(e.source) }}>
                      {e.username}
                    </span>
                    <span className="sub-panel-detail">{subDetail(e.sub)}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
