import { useEffect, useRef, useState } from 'react'
import { useSubCount } from '../hooks/useStore.js'

// Session sub-event counter in the header. Briefly flashes each time the count goes up.
export function SubCounter() {
  const subs = useSubCount()
  const prev = useRef(subs)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (subs > prev.current) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 900)
      prev.current = subs
      return () => clearTimeout(t)
    }
    prev.current = subs
  }, [subs])

  return (
    <span className={`sub-counter${flash ? ' flash' : ''}`} title="subs this session">
      🎉 {subs} sub{subs === 1 ? '' : 's'}
    </span>
  )
}
