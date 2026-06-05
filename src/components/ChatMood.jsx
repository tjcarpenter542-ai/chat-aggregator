import { useEngineSnapshot } from '../hooks/useStore.js'

// Sentiment lean meter, pinned full-width at the top. Same logic as the old KeywordBar's
// sentiment block — extracted so the trending words can move to the right rail. Keeps both the
// "CHAT MOOD: …" label and the colored bar.
export function ChatMood() {
  const { sentiment } = useEngineSnapshot()

  const lean = Math.round(sentiment * 100)
  const mood = lean > 5 ? 'Positive' : lean < -5 ? 'Negative' : 'Neutral'
  const hue = Math.round((sentiment + 1) * 60) // -1 -> 0 (red), +1 -> 120 (green)

  return (
    <div className="chat-mood" title={`chat mood lean: ${lean}`}>
      <span className="kw-sent-label">Chat Mood: {mood}</span>
      <span className="kw-sent-meter">
        <span
          className="kw-sent-fill"
          style={{ width: `${Math.abs(lean)}%`, backgroundColor: `hsl(${hue}, 70%, 45%)` }}
        />
      </span>
    </div>
  )
}
