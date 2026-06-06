import { useEffect, useState } from 'react'
import introLogo from '../assets/intro-logo.png'
import './Intro.css'

// Branded intro/splash that gates the app on a fresh page load. It auto-advances after a few
// seconds (the branded moment plays, then it fades into the app on its own) AND lets the user click
// the logo to enter immediately. It is a layer in FRONT of the app (a fixed overlay) — once it
// unmounts, the app underneath is fully interactive and untouched. Shown once per page load: its
// lifecycle is component state, with no persistence, so it never re-shows during a session.
const AUTO_ADVANCE_MS = 2600 // start the fade-out after the branded moment (~2.5-3s)
const FADE_MS = 950 // matches the .mb-intro CSS transition; unmount after it completes
const SETTLE_MS = 1500 // lock in the visible resting state (safety net for throttled animations)
const READY_MS = 1300 // enable logo hover after the big->small settle animation finishes

export function Intro() {
  const [phase, setPhase] = useState('visible') // 'visible' | 'entering' | 'done'
  const [settled, setSettled] = useState(false)
  const [ready, setReady] = useState(false)

  const enter = () => setPhase((p) => (p === 'visible' ? 'entering' : p))

  // Mount: schedule the settle/ready states and the auto-advance.
  useEffect(() => {
    const settleT = setTimeout(() => setSettled(true), SETTLE_MS)
    const readyT = setTimeout(() => setReady(true), READY_MS)
    const autoT = setTimeout(enter, AUTO_ADVANCE_MS)
    return () => {
      clearTimeout(settleT)
      clearTimeout(readyT)
      clearTimeout(autoT)
    }
  }, [])

  // Once entering, unmount the overlay after the fade transition completes.
  useEffect(() => {
    if (phase !== 'entering') return
    const t = setTimeout(() => setPhase('done'), FADE_MS)
    return () => clearTimeout(t)
  }, [phase])

  if (phase === 'done') return null

  return (
    <section
      className={`mb-intro${phase === 'entering' ? ' entering' : ''}${settled ? ' settled' : ''}`}
      role="dialog"
      aria-label="Market Bubble intro"
    >
      <div className="mb-frame">
        <span className="mb-tick tl" />
        <span className="mb-tick tr" />
        <span className="mb-tick bl" />
        <span className="mb-tick br" />

        <header className="mb-row-top">
          <div className="mb-tagline fade d2">
            <span>Make Money</span>
            <span>Command Attention</span>
            <span>Leverage AI</span>
          </div>
        </header>

        <div className="mb-center">
          <div className="mb-stage">
            <button
              className={`mb-logo${ready ? ' ready' : ''}`}
              aria-label="Enter Market Bubble"
              onClick={enter}
            >
              <div className="mb-logo-inner">
                <img className="mb-logo-img" src={introLogo} alt="Market Bubble" draggable="false" />
              </div>
            </button>

            <div className="mb-cta fade d4">
              <i className="mb-pin" /> Click the logo to invest in yourself
            </div>
          </div>
        </div>

        <footer className="mb-row-bottom">
          <div className="mb-quote fade d5">
            <span className="mb-mk">&ldquo;</span>Invest in Yourself<span className="mb-mk">&rdquo;</span>
          </div>
          <div className="mb-schedule fade d3">
            <span className="mb-live">
              <i className="mb-blink" />
              Live
            </span>
            <span className="mb-sep">·</span>Thursdays<span className="mb-sep">·</span>1PM PST
          </div>
          <div className="mb-presented fade d5">
            Presented by <b>Polymarket</b>
          </div>
        </footer>
      </div>
    </section>
  )
}
