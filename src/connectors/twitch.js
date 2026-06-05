import { normalize } from '../lib/normalize.js'
import { createReconnectingSocket } from '../lib/reconnectingSocket.js'

const TWITCH_WS = 'wss://irc-ws.chat.twitch.tv:443'

// Unescape IRCv3 tag values in a SINGLE left-to-right pass: \s -> space, \: -> ;, \\ -> \,
// \r, \n. A single pass avoids the mis-decode that sequential replaces produce (e.g. an
// escaped backslash followed by 's' would otherwise be turned into a space).
function unescapeTag(value) {
  return value.replace(/\\(.)/g, (_m, c) => {
    switch (c) {
      case 's':
        return ' '
      case ':':
        return ';'
      case 'r':
        return '\r'
      case 'n':
        return '\n'
      default:
        return c // covers \\ -> \ and any other escaped char
    }
  })
}

// Parse one raw IRC line into { tags, prefix, command, params }, or null if malformed
// (a tags- or prefix-segment with no following space — e.g. a truncated fragment).
export function parseIrcLine(line) {
  let rest = line
  const tags = {}
  if (rest.startsWith('@')) {
    const sp = rest.indexOf(' ')
    if (sp === -1) return null
    const tagStr = rest.slice(1, sp)
    rest = rest.slice(sp + 1)
    for (const pair of tagStr.split(';')) {
      const eq = pair.indexOf('=')
      if (eq === -1) tags[pair] = ''
      else tags[pair.slice(0, eq)] = unescapeTag(pair.slice(eq + 1))
    }
  }
  let prefix = ''
  if (rest.startsWith(':')) {
    const sp = rest.indexOf(' ')
    if (sp === -1) return null
    prefix = rest.slice(1, sp)
    rest = rest.slice(sp + 1)
  }
  const sp = rest.indexOf(' ')
  let command
  let params
  if (sp === -1) {
    command = rest
    params = ''
  } else {
    command = rest.slice(0, sp)
    params = rest.slice(sp + 1)
  }
  return { tags, prefix, command, params }
}

// Anonymous, read-only Twitch chat over IRC-WebSocket. No OAuth/token required — the
// `justinfan<random>` nick grants read-only access. Raw WebSockets are not CORS-bound,
// so this connects directly from the browser.
export function createTwitchConnector({ channel, onMessage, onStatus }) {
  const chan = String(channel).replace(/^#/, '').toLowerCase()
  const nick = `justinfan${Math.floor(Math.random() * 80000) + 1000}`
  let buffer = '' // accumulates a partial trailing line split across WS frames

  const socket = createReconnectingSocket({
    url: TWITCH_WS,
    onStatus,
    // Proactively keep the socket alive; Twitch replies PONG, which re-arms the watchdog
    // so a quiet channel doesn't get force-reconnected every HEARTBEAT_TIMEOUT_MS.
    keepAlive: (ws) => ws.send('PING :keepalive\r\n'),
    onOpen: (ws) => {
      buffer = ''
      // Each command on its own line, CRLF-terminated. Skip twitch.tv/membership (JOIN/PART spam).
      ws.send('PASS SCHMOOPIIE\r\n')
      ws.send(`NICK ${nick}\r\n`)
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands\r\n')
      ws.send(`JOIN #${chan}\r\n`)
    },
    onMessage: (event, ws) => {
      // Buffer across frames: Twitch does not guarantee a WS frame ends on a line boundary.
      buffer += String(event.data)
      const lines = buffer.split('\r\n')
      buffer = lines.pop() // keep the trailing (possibly partial) line for the next frame
      for (const line of lines) {
        if (!line) continue
        // Keepalive: reply to server PING to avoid disconnection.
        if (line.startsWith('PING')) {
          ws.send('PONG :tmi.twitch.tv\r\n')
          continue
        }
        const parsed = parseIrcLine(line)
        if (!parsed) continue
        const { tags, prefix, command, params } = parsed
        // Twitch asks us to reconnect for maintenance.
        if (command === 'RECONNECT') {
          try {
            ws.close()
          } catch {
            /* reconnect handles it */
          }
          continue
        }
        // NOTICE surfaces join/channel problems (suspended/invalid channel, etc.) — show it
        // instead of leaving the feed looking healthy while silently receiving nothing.
        if (command === 'NOTICE') {
          const i = params.indexOf(' :')
          onStatus?.('error', i === -1 ? params : params.slice(i + 2))
          continue
        }
        if (command !== 'PRIVMSG') continue
        // params is "#channel :message text"
        const idx = params.indexOf(' :')
        if (idx === -1) continue
        const text = params.slice(idx + 2)
        const nickFromPrefix = prefix.split('!')[0]
        onMessage(
          normalize({
            source: 'twitch',
            username: tags['display-name'] || nickFromPrefix,
            message: text,
            timestamp: tags['tmi-sent-ts'] ? Number(tags['tmi-sent-ts']) : Date.now(),
            id: tags['id'],
          }),
        )
      }
    },
  })

  return { close: socket.close }
}
