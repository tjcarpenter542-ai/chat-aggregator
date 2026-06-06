import { useEffect, useRef, useState } from 'react'
import { SOURCES, sourceLabel } from '../config.js'
import { store } from '../lib/chatStore.js'

const ERROR_TIMEOUT_MS = 2000 // the validation hint auto-dismisses on its own after ~2s

// Add a feed live: pick a source, type a channel. For Kick, an optional chatroom-ID field
// is the fallback when Cloudflare blocks the auto-lookup.
export function ChannelInput() {
  const [source, setSource] = useState('twitch')
  const [channel, setChannel] = useState('')
  const [chatroomId, setChatroomId] = useState('')
  const [error, setError] = useState('')
  const errorTimer = useRef(null)

  // The error only flags the LAST empty/invalid submit. It auto-dismisses on its own after
  // ERROR_TIMEOUT_MS (no interaction needed) and ALSO clears immediately on any form edit — typing
  // in either field or switching source — or a successful add. showError (re)starts the timer on
  // every submit, so a re-submit re-shows the hint for the full window even if the text is identical.
  const showError = (msg) => {
    setError(msg)
    clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => setError(''), ERROR_TIMEOUT_MS)
  }
  const clearError = () => {
    clearTimeout(errorTimer.current)
    setError('')
  }
  // Cancel a pending auto-dismiss if the component unmounts, so it can't fire on a dead component.
  useEffect(() => () => clearTimeout(errorTimer.current), [])

  const submit = (e) => {
    e.preventDefault()
    clearError()
    const ch = channel.trim().replace(/^#/, '')
    if (!ch) {
      showError('Enter a channel name')
      return
    }
    const cid = chatroomId.trim()
    if (source === 'kick') {
      if (!cid) {
        showError('Chatroom ID is required for Kick')
        return
      }
      if (!/^\d+$/.test(cid)) {
        showError('Chatroom ID must be numeric')
        return
      }
    }
    const res = store.addFeed({
      source,
      channel: ch,
      chatroomId: source === 'kick' ? cid : undefined,
    })
    if (!res.ok) {
      showError(res.error)
      return
    }
    setChannel('')
    setChatroomId('')
  }

  return (
    <form className="channel-input" onSubmit={submit}>
      <select
        value={source}
        onChange={(e) => {
          setSource(e.target.value)
          clearError()
        }}
        aria-label="source"
      >
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
          clearError() // the validation hint clears the moment the user starts typing
        }}
      />
      {source === 'kick' && (
        <input
          type="text"
          className="chatroom-id"
          placeholder="Chatroom ID (required)"
          value={chatroomId}
          onChange={(e) => {
            setChatroomId(e.target.value)
            clearError()
          }}
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
