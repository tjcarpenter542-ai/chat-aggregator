import { useFeeds } from '../hooks/useStore.js'

// On-air status pill next to the wordmark. Reflects REAL connection state: green "● LIVE" when at
// least one feed is actively connected (status 'open'), grey "● OFFLINE" when none are.
export function LiveStatus() {
  const feeds = useFeeds()
  const live = feeds.some((f) => f.status === 'open')

  return (
    <span className={`app-live ${live ? 'is-live' : 'is-offline'}`} title={live ? 'A feed is connected' : 'No feeds connected'}>
      <span className="app-live-dot" />
      {live ? 'Live' : 'Offline'}
    </span>
  )
}
