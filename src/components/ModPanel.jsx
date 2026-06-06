import { useEffect, useRef, useState } from 'react'
import { useModEvents, useModCounts } from '../hooks/useStore.js'
import { useAvoidVideoOverlap } from '../hooks/useAvoidVideoOverlap.js'
import { sourceColor, sourceLabel } from '../config.js'

// Normalize a duration in seconds to a compact label (10s / 10m / 1h / 1d).
function fmtDuration(sec) {
  if (!sec || sec <= 0) return ''
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.round(sec / 60)}m`
  if (sec < 86400) return `${Math.round(sec / 3600)}h`
  return `${Math.round(sec / 86400)}d`
}

const ICON = { timeout: '⛔', ban: '🔨', delete: '🗑', clear: '🧹' }

// What moderation happened — never WHO did it (anonymous IRC / Kick don't reveal the moderator).
function modDescription(mod) {
  const t = mod?.target
  switch (mod?.action) {
    case 'timeout': {
      const d = fmtDuration(mod.durationSec)
      return `${t || 'a user'} timed out${d ? ` ${d}` : ''}`
    }
    case 'ban':
      return `${t || 'a user'} banned`
    case 'delete':
      return t ? `${t}'s message deleted` : 'message deleted'
    case 'clear':
      return 'chat cleared'
    default:
      return mod?.detail || 'mod action'
  }
}

// Moderation-activity view: a header pill with the session total, opening a panel that breaks the
// count down per channel (so a host sees how hard each chat is being moderated) and lists recent
// actions. Styled like the sub roster. Uses REAL mod events parsed from the existing connections.
export function ModPanel() {
  const events = useModEvents()
  const counts = useModCounts()
  // Exact session total from the uncapped per-channel counts (events[] is a capped recent roster).
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState(null) // "source:channel" to focus the action list, or null = all
  const wrapRef = useRef(null)
  const panelRef = useRef(null)
  // Never let this panel's box overlap the video iframe (Twitch rebuffers if anything paints over it).
  useAvoidVideoOverlap(panelRef, open)

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

  const channelRows = Object.entries(counts).sort((a, b) => b[1] - a[1])
  // Ignore a stale filter (e.g. after clear()) so it falls back to showing all.
  const active = filter != null && counts[filter] != null ? filter : null
  const shown = active ? events.filter((e) => `${e.source}:${e.channel}` === active) : events

  return (
    <div className="mod-counter-wrap" ref={wrapRef}>
      <button
        className="mod-counter"
        title="moderation actions this session — click for activity"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        🛡 {total} mod{total === 1 ? '' : 's'}
      </button>
      {open && (
        <div className="mod-panel" role="dialog" aria-label="Moderation activity this session" ref={panelRef}>
          <div className="mod-panel-head">
            <span>Moderation activity</span>
            <span className="mod-panel-count">{total}</span>
          </div>
          {channelRows.length > 0 && (
            <div className="mod-bychannel" data-filtered={active != null}>
              <button
                className={`mod-all${active == null ? ' is-active' : ''}`}
                onClick={() => setFilter(null)}
                aria-pressed={active == null}
                title="Show actions from all channels"
              >
                All
              </button>
              {channelRows.map(([key, n]) => {
                const [source, ...rest] = key.split(':')
                const channel = rest.join(':')
                const isActive = active === key
                return (
                  <button
                    type="button"
                    className={`mod-chan-row${isActive ? ' is-active' : ''}`}
                    key={key}
                    onClick={() => setFilter(isActive ? null : key)}
                    aria-pressed={isActive}
                    title={`Show only ${sourceLabel(source)} · ${channel}`}
                  >
                    <span className="mod-badge" style={{ backgroundColor: sourceColor(source) }}>
                      {sourceLabel(source)}
                    </span>
                    <span className="mod-chan" style={{ color: sourceColor(source) }}>
                      {channel}
                    </span>
                    <span className="mod-chan-n">{n}</span>
                  </button>
                )
              })}
            </div>
          )}
          {total === 0 ? (
            <div className="mod-panel-empty">No moderation actions yet this session.</div>
          ) : (
            <ul className="mod-panel-list">
              {shown
                .slice()
                .reverse()
                .slice(0, 100)
                .map((e) => (
                  <li key={e.id} className="mod-item">
                    <span className="mod-item-icon">{ICON[e.mod?.action] || '•'}</span>
                    <span className="mod-item-desc">{modDescription(e.mod)}</span>
                    <span className="mod-badge" style={{ backgroundColor: sourceColor(e.source) }}>
                      {sourceLabel(e.source)}
                    </span>
                    <span className="mod-chan" style={{ color: sourceColor(e.source) }}>
                      {e.channel}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
