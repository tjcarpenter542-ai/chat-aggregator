import { memo } from 'react'
import { sourceColor, sourceLabel } from '../config.js'

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// One chat line: [source badge] time username: message — tinted by the source color.
function MessageRowBase({ msg }) {
  const color = sourceColor(msg.source)
  return (
    <div className="msg-row">
      <span className="msg-badge" style={{ backgroundColor: color }}>
        {sourceLabel(msg.source)}
      </span>
      <span className="msg-time">{formatTime(msg.timestamp)}</span>
      <span className="msg-user" style={{ color }}>
        {msg.username}
      </span>
      <span className="msg-text">{msg.message}</span>
    </div>
  )
}

export const MessageRow = memo(MessageRowBase)
