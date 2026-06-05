import { useEffect } from 'react'
import { SpikeBanner } from './components/SpikeBanner.jsx'
import { KeywordBar } from './components/KeywordBar.jsx'
import { ChannelInput } from './components/ChannelInput.jsx'
import { FeedList } from './components/FeedList.jsx'
import { ChatFeed } from './components/ChatFeed.jsx'
import { store } from './lib/chatStore.js'
import { getDefaultChannels } from './config.js'

export default function App() {
  useEffect(() => {
    // Seed default feeds once on mount. addFeed dedupes by key, so StrictMode's
    // double-invoke in dev won't create duplicate connectors.
    for (const { source, channel } of getDefaultChannels()) {
      store.addFeed({ source, channel })
    }
  }, [])

  return (
    <div className="app">
      <header className="app-top">
        <SpikeBanner />
        <KeywordBar />
      </header>

      <section className="app-controls">
        <div className="app-title-row">
          <h1 className="app-title">Chat Aggregator</h1>
          <span className="app-subtitle">Twitch · Kick · X — one live feed</span>
        </div>
        <ChannelInput />
        <FeedList />
      </section>

      <ChatFeed />
    </div>
  )
}
