import { useEffect, useState } from 'react'
import './Disclaimer.css'

// "Not Financial Advice" disclaimer — the FIRST screen on load, shown ahead of the intro splash.
// A fixed overlay (like Intro) that auto-advances after the timer bar empties, with click- or
// key-to-skip. Ported from the Claude Design handoff with its visual design intact. Shown once per
// page load — its lifecycle is component state with no persistence — and sequenced by Startup.jsx.
const HOLD_MS = 5000 // the copy is readable for ~5s...
const BAR_DELAY_MS = 500 // ...the timer bar starts depleting 0.5s in (matches .timer animation-delay)
const FADE_MS = 650 // matches the .nfa opacity transition; unmount after it completes

export function Disclaimer({ onLeaveStart, onDone }) {
  const [leaving, setLeaving] = useState(false)

  const dismiss = () => setLeaving(true)

  // Auto-advance once the timer bar empties (the hold plus the bar's 0.5s start delay).
  useEffect(() => {
    const t = setTimeout(dismiss, HOLD_MS + BAR_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  // On leave: tell the sequencer to bring the intro up underneath (so the fade cross-dissolves into
  // it rather than flashing the app), then unmount this overlay once the fade completes.
  useEffect(() => {
    if (!leaving) return
    onLeaveStart?.()
    const t = setTimeout(() => onDone?.(), FADE_MS)
    return () => clearTimeout(t)
  }, [leaving, onLeaveStart, onDone])

  return (
    <div
      className={`nfa${leaving ? ' is-leaving' : ''}`}
      style={{ '--nfa-hold': `${HOLD_MS}ms` }}
      role="dialog"
      aria-label="Not Financial Advice disclaimer"
      tabIndex={0}
      onClick={dismiss}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault()
          dismiss()
        }
      }}
    >
      <div className="wrap">
        <div className="lockup reveal d1">
          <div className="nf-box">
            <div className="nf" aria-hidden="true">
              NF
            </div>
          </div>
          <div className="right">
            <div className="title-box">
              <div className="title">NOT FINANCIAL ADVICE</div>
            </div>
            <div className="age-box">
              <div className="age">18 YEARS OR OLDER</div>
            </div>
          </div>
        </div>

        <div className="copy">
          <p className="reveal d2">
            The information and content provided herein are for general informational and educational
            purposes only and do not constitute financial, investment, tax, legal, or accounting
            advice. Nothing presented should be construed as a recommendation, solicitation, or offer
            to buy, sell, or hold any security, asset, or financial instrument.
          </p>
          <p className="indent reveal d3">
            All views and analyses are those of the author(s) at the time of writing and are subject
            to change without notice. While reasonable efforts have been made to ensure accuracy, no
            representation or warranty, express or implied, is made as to the completeness,
            reliability, or timeliness of the information.
          </p>
          <p className="indent reveal d4">
            Any decisions made based on this content are taken at your own risk. Past performance is
            not indicative of future results, and all investments carry risk, including the potential
            loss of principal. You should consult with a qualified, licensed financial advisor or
            other appropriate professional regarding your specific circumstances before making any
            financial decisions.
          </p>
          <p className="indent reveal d5">
            The hosts and publishers disclaim any and all liability for losses or damages, direct or
            indirect, arising from reliance on the information provided.
          </p>
        </div>

        <div className="skip reveal d5">Click anywhere to continue</div>
        <div className="timer reveal d5" aria-hidden="true" />
      </div>
    </div>
  )
}
