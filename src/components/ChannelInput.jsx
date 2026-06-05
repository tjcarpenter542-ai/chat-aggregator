import { useState } from 'react'
import { SOURCES, sourceLabel } from '../config.js'
import { store } from '../lib/chatStore.js'

// Add a feed live: pick a source, type a channel. For Kick, an optional chatroom-ID field
// is the fallback when Cloudflare blocks the auto-lookup.
export function ChannelInput() {
  const [source, setSource] = useState('twitch')
  const [channel, setChannel] = useState('')
  const [chatroomId, setChatroomId] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setError('')
    const ch = channel.trim().replace(/^#/, '')
    if (!ch) {
      setError('Enter a channel name')
      return
    }
    const cid = chatroomId.trim()
    if (source === 'kick' && cid && !/^\d+$/.test(cid)) {
      setError('Chatroom ID must be numeric')
      return
    }
    const res = store.addFeed({
      source,
      channel: ch,
      chatroomId: source === 'kick' && cid ? cid : undefined,
    })
    if (!res.ok) {
      setError(res.error)
      return
    }
    setChannel('')
    setChatroomId('')
  }

  return (
    <form className="channel-input" onSubmit={submit}>
      <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="source">
        {SOURCES.map((s) => (
          <option key={s} value={s}>
            {sourceLabel(s)}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder={source === 'kick' ? 'kick channel slug' : `${sourceLabel(source)} channel`}
        value={channel}
        onChange={(e) => setChannel(e.target.value)}
      />
      {source === 'kick' && (
        <input
          type="text"
          className="chatroom-id"
          placeholder="chatroom ID (optional)"
          value={chatroomId}
          onChange={(e) => setChatroomId(e.target.value)}
          title="If the auto-lookup is blocked by Cloudflare, paste the numeric chatroom ID here."
        />
      )}
      <button type="submit">Add feed</button>
      {error && <span className="ci-error">{error}</span>}
    </form>
  )
}
