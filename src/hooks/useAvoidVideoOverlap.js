import { useLayoutEffect } from 'react'

// Keep an open header dropdown (the sub roster / mod activity panels) from EVER overlapping the
// companion video iframe. Twitch's player rebuffers (the stream visibly pauses) whenever an opaque
// element repaints over its iframe, and these panels drop straight down out of the header into the
// feed column where the video lives — so once a panel grows past a few entries its box reaches the
// iframe and the stream stalls. Rather than trying to make the overlap "cheap" to composite, we
// guarantee the boxes never intersect at all, at ANY entry count.
//
// The panels are top-anchored (they grow downward), so we cap the panel's max-height to keep its
// bottom edge above the iframe's top edge — but only when the two are horizontally overlapping,
// since boxes that don't overlap horizontally can never intersect no matter how tall the panel
// gets. Past the cap the panel just scrolls internally. With no video on screen there's no iframe,
// so no constraint is applied and the panel uses its full CSS max-height.

const GAP_PX = 8 // keep a small breathing gap between the panel's bottom and the iframe's top

// Pure geometry: the px max-height that keeps `panelRect` clear of `iframeRect`, or null when no
// constraint is needed (the two are already horizontally disjoint, so they can never intersect).
export function clampHeightClearOfIframe(panelRect, iframeRect, gap = GAP_PX) {
  const horizontallyClear = panelRect.right <= iframeRect.left || panelRect.left >= iframeRect.right
  if (horizontallyClear) return null
  // Top-anchored panel: bottom = top + height. Cap height so bottom <= iframeTop - gap.
  return Math.max(0, iframeRect.top - panelRect.top - gap)
}

export function useAvoidVideoOverlap(panelRef, open) {
  useLayoutEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return

    const apply = () => {
      const iframe = document.querySelector('.video-iframe')
      if (!iframe) {
        panel.style.maxHeight = '' // stream closed: no iframe to dodge -> use the CSS max-height
        return
      }
      // The panel is top-anchored and fixed-width, so its measured top/left/right are stable
      // whether or not a previous cap is in effect — only its height changes. Safe to measure live.
      const limit = clampHeightClearOfIframe(panel.getBoundingClientRect(), iframe.getBoundingClientRect())
      panel.style.maxHeight = limit == null ? '' : `${limit}px`
    }

    apply()

    // Re-measure on anything that can move either box: viewport resize, scroll, the panel's own
    // content growing/shrinking, and the feed column resizing (adding a feed grows the controls and
    // shifts the video down, which a panel-only observer wouldn't catch).
    window.addEventListener('resize', apply)
    window.addEventListener('scroll', apply, true)
    const ro = new ResizeObserver(apply)
    ro.observe(panel)
    const body = document.querySelector('.app-body')
    if (body) ro.observe(body)

    return () => {
      window.removeEventListener('resize', apply)
      window.removeEventListener('scroll', apply, true)
      ro.disconnect()
      panel.style.maxHeight = ''
    }
  }, [panelRef, open])
}
