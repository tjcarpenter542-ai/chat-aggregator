import { useEngineSnapshot } from '../hooks/useStore.js'

// Sentiment lean meter, pinned full-width at the top — styled as a "market watch" sentiment strip:
// green when chat leans positive, red when negative, neutral grey at the line. Same lean logic as
// the old KeywordBar's sentiment block. Keeps the "CHAT MOOD: …" label AND the colored bar.
export function ChatMood() {
  const { sentiment } = useEngineSnapshot()

  const lean = Math.round(sentiment * 100)
  const dir = lean > 5 ? 'up' : lean < -5 ? 'down' : 'flat'
  const mood = dir === 'up' ? 'Positive' : dir === 'down' ? 'Negative' : 'Neutral'
  const color = dir === 'up' ? 'var(--up)' : dir === 'down' ? 'var(--down)' : 'var(--text-dim)'

  return (
    <div className={`chat-mood mood-${dir}`} title={`chat mood lean: ${lean}`}>
      <span className="kw-sent-label">
        Chat Mood:{' '}
        <span className="kw-sent-mood" style={{ color }}>
          {mood}
        </span>
      </span>
      <span className="kw-sent-meter">
        <span className="kw-sent-fill" style={{ width: `${Math.abs(lean)}%`, backgroundColor: color }} />
      </span>
      <span className="kw-sent-value" style={{ color }}>
        {lean > 0 ? `+${lean}` : lean}
      </span>
    </div>
  )
}
