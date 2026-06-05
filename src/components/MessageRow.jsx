import { memo } from 'react'
import { sourceColor, sourceLabel } from '../config.js'

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// One chat line. Sub events get a distinct glowing treatment (gold border, "🎉 NEW SUB"
// badge, emphasized username); regular chat is [source badge] time username: message.
function MessageRowBase({ msg }) {
  const color = sourceColor(msg.source)

  if (msg.type === 'sub') {
    return (
      <div className="msg-row msg-sub">
        <span className="msg-sub-badge">🎉 NEW SUB</span>
        <span className="msg-badge" style={{ backgroundColor: color }}>
          {sourceLabel(msg.source)}
        </span>
        <span className="msg-user msg-sub-user" style={{ color }}>
          {msg.username}
        </span>
        <span className="msg-text msg-sub-text">{msg.message}</span>
      </div>
    )
  }

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
