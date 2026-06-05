import { useEffect, useState } from 'react'
import logo from './assets/market-bubble-logo.jpg'
import { SpikeBanner } from './components/SpikeBanner.jsx'
import { ChatMood } from './components/ChatMood.jsx'
import { ChannelInput } from './components/ChannelInput.jsx'
import { FeedList } from './components/FeedList.jsx'
import { ChatFeed } from './components/ChatFeed.jsx'
import { TrendingPanel } from './components/TrendingPanel.jsx'
import { SubCounter } from './components/SubCounter.jsx'
import { ModPanel } from './components/ModPanel.jsx'
import { LiveStatus } from './components/LiveStatus.jsx'
import { VideoPanel } from './components/VideoPanel.jsx'
import { CryptoTicker } from './components/CryptoTicker.jsx'
import { store } from './lib/chatStore.js'
import { getDefaultChannels } from './config.js'

export default function App() {
  const [showStream, setShowStream] = useState(false)
  const [filter, setFilter] = useState(null) // feed key "source:channel" to focus on, or null = all

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
        <ChatMood />
      </header>

      <section className="app-controls">
        <div className="app-title-row">
          <div className="app-brand">
            <img src={logo} className="app-logo" alt="Market Bubble logo" />
            <div className="app-wordmark">
              <h1 className="app-title">Market Bubble</h1>
              <span className="app-tagline">&ldquo;Invest in Yourself&rdquo;</span>
              <span className="app-subtitle">Live Chat Intelligence · Twitch · Kick · X</span>
            </div>
            <LiveStatus />
          </div>
          <div className="header-right">
            <SubCounter />
            <ModPanel />
            <button
              className={`stream-toggle${showStream ? ' is-active' : ''}`}
              onClick={() => setShowStream((s) => !s)}
              aria-pressed={showStream}
              title="Watch the stream alongside chat"
            >
              📺 {showStream ? 'Hide stream' : 'Watch stream'}
            </button>
            <button className="clear-btn" onClick={() => store.clear()} title="Clear the feed and reset the keyword engine (feeds stay connected)">
              Clear
            </button>
          </div>
        </div>
        <ChannelInput />
        <FeedList activeFilter={filter} onFilter={setFilter} />
      </section>

      <div className="app-body">
        <div className="feed-col">
          {showStream && <VideoPanel onClose={() => setShowStream(false)} />}
          <ChatFeed filter={filter} />
        </div>
        <TrendingPanel />
      </div>

      <CryptoTicker />
    </div>
  )
}
