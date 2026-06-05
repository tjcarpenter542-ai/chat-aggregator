import { normalize } from '../lib/normalize.js'
import { createReconnectingSocket } from '../lib/reconnectingSocket.js'

const TWITCH_WS = 'wss://irc-ws.chat.twitch.tv:443'

// USERNOTICE msg-id values that represent a (re)subscription or gift sub.
const SUB_MSG_IDS = new Set(['sub', 'resub', 'subgift', 'submysterygift'])

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

// Map a parsed CLEARCHAT/CLEARMSG line to a mod-action { action, target?, durationSec?, detail? },
// or null if it's not a moderation command. CLEARCHAT with a target user is a timeout (when
// `ban-duration` seconds is present) or a permanent ban (when absent); with no target it's a full
// chat clear. CLEARMSG deletes one message (the `login` tag is its author). Anonymous IRC does NOT
// reveal which moderator acted — these are attributed to the channel, never a named mod.
export function clearToMod({ command, tags, params }) {
  if (command === 'CLEARCHAT') {
    const i = params.indexOf(' :')
    const target = i === -1 ? '' : params.slice(i + 2)
    if (!target) return { action: 'clear', detail: 'chat cleared' }
    const banDur = tags['ban-duration']
    if (banDur) return { action: 'timeout', target, durationSec: Number(banDur) || undefined }
    return { action: 'ban', target }
  }
  if (command === 'CLEARMSG') {
    const i = params.indexOf(' :')
    const text = i === -1 ? '' : params.slice(i + 2)
    const login = tags['login'] || ''
    return { action: 'delete', target: login || undefined, detail: text ? text.slice(0, 80) : undefined }
  }
  return null
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
        // USERNOTICE carries sub/resub/gift events. system-msg is the human-readable summary.
        if (command === 'USERNOTICE') {
          const msgId = tags['msg-id']
          if (SUB_MSG_IDS.has(msgId)) {
            const i = params.indexOf(' :')
            const userComment = i === -1 ? '' : params.slice(i + 2)
            onMessage(
              normalize({
                source: 'twitch',
                channel,
                username: tags['display-name'] || tags['login'] || 'someone',
                message: tags['system-msg'] || userComment || 'subscribed',
                timestamp: tags['tmi-sent-ts'] ? Number(tags['tmi-sent-ts']) : Date.now(),
                id: tags['id'],
                type: 'sub',
                sub: {
                  msgId,
                  months: tags['msg-param-cumulative-months'] || tags['msg-param-months'] || undefined,
                  tier: tags['msg-param-sub-plan'] || undefined,
                  giftCount: tags['msg-param-mass-gift-count'] || undefined,
                  recipient: tags['msg-param-recipient-display-name'] || undefined,
                },
              }),
            )
          }
          continue
        }
        // CLEARCHAT (timeout/ban/chat-clear) and CLEARMSG (single message deleted) -> mod events,
        // attributed to the channel (anonymous IRC never says which moderator acted).
        if (command === 'CLEARCHAT' || command === 'CLEARMSG') {
          const m = clearToMod(parsed)
          if (m) {
            const refId = tags['target-msg-id'] || tags['target-user-id']
            onMessage(
              normalize({
                source: 'twitch',
                channel,
                username: m.target || '',
                timestamp: tags['tmi-sent-ts'] ? Number(tags['tmi-sent-ts']) : Date.now(),
                id: refId ? `mod-${refId}-${tags['tmi-sent-ts'] || ''}` : undefined,
                type: 'mod',
                mod: m,
              }),
            )
          }
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
            channel,
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
