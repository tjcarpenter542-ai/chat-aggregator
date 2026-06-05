import { useState } from 'react'
import { useFeeds } from '../hooks/useStore.js'
import { sourceLabel } from '../config.js'

// Only these platforms have an embeddable web player (X is a stub with no video).
const VIDEO_SOURCES = new Set(['twitch', 'kick'])

// Build the embed URL for a feed. Twitch's iframe REQUIRES a `parent` matching the embedding
// host, so we derive it from window.location.hostname (works on localhost and any deployment).
function videoSrc(feed) {
  const channel = encodeURIComponent(feed.channel)
  if (feed.source === 'twitch') {
    const parent = encodeURIComponent(window.location.hostname)
    return `https://player.twitch.tv/?channel=${channel}&parent=${parent}&muted=true&autoplay=true`
  }
  if (feed.source === 'kick') {
    return `https://player.kick.com/${channel}?muted=true&autoplay=true`
  }
  return null
}

// Optional companion video panel — lives above the chat feed in the left column so it never
// crowds the spike banner, Chat Mood, or trending rail. When more than one stream is available
// the user can pick which one plays; defaults to the first CONNECTED feed.
export function VideoPanel({ onClose }) {
  const feeds = useFeeds()
  const [selectedKey, setSelectedKey] = useState(null)

  const videoFeeds = feeds.filter((f) => VIDEO_SOURCES.has(f.source))
  // Honor the user's pick if still valid; otherwise default to the first connected stream,
  // then fall back to the first available one.
  const current =
    videoFeeds.find((f) => f.key === selectedKey) ||
    videoFeeds.find((f) => f.status === 'open') ||
    videoFeeds[0] ||
    null

  return (
    <div className="video-panel">
      <div className="video-bar">
        <span className="video-bar-title">📺 Stream</span>
        {videoFeeds.length > 1 ? (
          <select
            className="video-pick"
            value={current ? current.key : ''}
            onChange={(e) => setSelectedKey(e.target.value)}
            aria-label="choose which stream to watch"
          >
            {videoFeeds.map((f) => (
              <option key={f.key} value={f.key}>
                {sourceLabel(f.source)} · {f.channel}
              </option>
            ))}
          </select>
        ) : current ? (
          <span className="video-now">
            {sourceLabel(current.source)} · {current.channel}
          </span>
        ) : null}
        <button className="video-close" onClick={onClose} aria-label="hide stream" title="Hide stream">
          ✕
        </button>
      </div>
      {current ? (
        <div className="video-frame">
          <iframe
            key={current.key}
            className="video-iframe"
            src={videoSrc(current)}
            title={`${sourceLabel(current.source)} ${current.channel} stream`}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="video-empty">Add a Twitch or Kick channel to watch its stream here.</div>
      )}
    </div>
  )
}
