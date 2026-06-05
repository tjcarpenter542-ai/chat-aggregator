import { MAX_MESSAGES, TOP_N, WINDOW_MS } from './lib/constants.js'

// Per-source display metadata. Colors are mirrored as CSS variables in index.css.
export const SOURCE_META = {
  twitch: { label: 'Twitch', color: '#9147ff' },
  kick: { label: 'Kick', color: '#53fc18' },
  x: { label: 'X', color: '#1d9bf0' },
}

export const SOURCES = Object.keys(SOURCE_META)

export function sourceColor(source) {
  return SOURCE_META[source]?.color ?? '#888888'
}

export function sourceLabel(source) {
  return SOURCE_META[source]?.label ?? source
}

// Parse VITE_DEFAULT_CHANNELS ("source:channel,source:channel") into [{ source, channel }].
// Placeholder entries (channel starts with "placeholder") and unknown sources are dropped,
// so a freshly-cloned repo with the example env never tries to connect to a fake channel.
export function getDefaultChannels() {
  const raw = import.meta.env.VITE_DEFAULT_CHANNELS ?? ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [source, ...rest] = entry.split(':')
      return { source: source.trim(), channel: rest.join(':').trim() }
    })
    .filter(
      (f) => SOURCES.includes(f.source) && f.channel && !f.channel.startsWith('placeholder'),
    )
}

export { MAX_MESSAGES, TOP_N, WINDOW_MS }
