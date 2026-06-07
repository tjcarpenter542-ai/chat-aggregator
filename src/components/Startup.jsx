import { useCallback, useState } from 'react'
import { Disclaimer } from './Disclaimer.jsx'
import { Intro } from './Intro.jsx'

// Boot sequence layered in FRONT of the app: the "Not Financial Advice" disclaimer shows first
// (~5s, click/key to skip), then the existing intro splash plays exactly as before, then both are
// gone and the app underneath is fully interactive. Shown once per page load (component state only).
//
// The intro mounts beneath the disclaimer the moment the disclaimer starts leaving, so the
// disclaimer's fade cross-dissolves into the intro instead of briefly flashing the app. The intro
// itself is unmodified — it just begins as the disclaimer fades out — and it self-unmounts when done.
export function Startup() {
  const [introMounted, setIntroMounted] = useState(false)
  const [disclaimerDone, setDisclaimerDone] = useState(false)

  // Stable handlers so the Disclaimer's effects don't re-run when this component re-renders.
  const onLeaveStart = useCallback(() => setIntroMounted(true), [])
  const onDone = useCallback(() => setDisclaimerDone(true), [])

  return (
    <>
      {introMounted && <Intro />}
      {!disclaimerDone && <Disclaimer onLeaveStart={onLeaveStart} onDone={onDone} />}
    </>
  )
}
