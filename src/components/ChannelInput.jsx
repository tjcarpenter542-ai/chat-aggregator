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
    if (source === 'kick') {
      if (!cid) {
        setError('Chatroom ID is required for Kick')
        return
      }
      if (!/^\d+$/.test(cid)) {
        setError('Chatroom ID must be numeric')
        return
      }
    }
    const res = store.addFeed({
      source,
      channel: ch,
      chatroomId: source === 'kick' ? cid : undefined,
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
        onChange={(e) => {
          setChannel(e.target.value)
          if (error) setError('') // the validation hint clears the moment the user starts typing
        }}
      />
      {source === 'kick' && (
        <input
          type="text"
          className="chatroom-id"
          placeholder="Chatroom ID (required)"
          value={chatroomId}
          onChange={(e) => setChatroomId(e.target.value)}
          title="Kick auto-lookup is unreliable behind Cloudflare, so the numeric chatroom ID is required."
        />
      )}
      <button type="submit">Add feed</button>
      {error && <span className="ci-error">{error}</span>}
      {source === 'kick' && (
        <span className="ci-hint">Find the chatroom ID at b3ck.com/kick/info.</span>
      )}
    </form>
  )
}
