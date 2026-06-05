import { normalize } from '../lib/normalize.js'
import { createReconnectingSocket } from '../lib/reconnectingSocket.js'

// Kick's Pusher app key (cluster us2). UNOFFICIAL + may rotate: if Kick chat stops arriving,
// open DevTools > Network > WS, filter "pusher", and copy the new app key from the URL here.
const KICK_PUSHER_KEY = '32cbd69e4b950bf97679'
const KICK_PUSHER_URL = `wss://ws-us2.pusher.com/app/${KICK_PUSHER_KEY}?protocol=7&client=js&version=8.4.0&flash=false`

// Kick renames the Pusher chat event from time to time — it has shipped both
// `App\Chat\Events\ChatMessageEvent` (older) and `App\Events\ChatMessageEvent` (current).
// Match on the suffix so we survive that namespace churn.
export const isChatMessageEvent = (event) => /(^|\\)ChatMessageEvent$/.test(event)

// Kick message `content` embeds emotes as `[emote:<id>:<name>]`. Replace each token with just
// its bare name so the feed shows readable text AND the keyword engine counts the emote name
// as a normal word (e.g. `[emote:2383630:Jordanw]` -> `Jordanw`).
export function renderEmotes(content) {
  if (!content) return ''
  return content.replace(/\[emote:\d+:([^\]]+)\]/g, '$1')
}

// Resolve a channel slug to its numeric chatroom id via the Vite dev proxy.
// NOTE: Kick sits behind Cloudflare; this can 403 even through the proxy (TLS fingerprinting).
// Callers should fall back to a manually-entered chatroom id when this throws.
export async function lookupChatroomId(slug) {
  const res = await fetch(`/kick-api/api/v2/channels/${encodeURIComponent(slug)}`)
  if (!res.ok) throw new Error(`Kick lookup failed (HTTP ${res.status})`)
  const data = await res.json()
  const id = data?.chatroom?.id
  if (!id) throw new Error('Kick lookup: chatroom id not found in response')
  return id
}

// Kick's created_at is normally an ISO string, but be defensive about epoch numbers/strings
// so an unexpected format doesn't silently re-stamp the message to "now" (which would
// distort the rolling-window spike math).
function parseKickTimestamp(createdAt) {
  if (createdAt == null) return Date.now()
  if (typeof createdAt === 'number') return createdAt < 1e12 ? createdAt * 1000 : createdAt
  const s = String(createdAt)
  if (/^\d+$/.test(s)) {
    const n = Number(s)
    return n < 1e12 ? n * 1000 : n
  }
  const ms = Date.parse(s)
  return Number.isNaN(ms) ? Date.now() : ms
}

// Unofficial Kick chat via Pusher WebSocket. The Pusher WS itself is not CORS-bound, so it
// connects directly from the browser; only the chatroom-id lookup needs the proxy/fallback.
export function createKickConnector({ channel, chatroomId, onMessage, onStatus }) {
  let closed = false
  let socket = null

  async function start() {
    // Only trust a NUMERIC manual chatroom id; a stray non-numeric value would subscribe to
    // a dead channel that silently receives nothing, so fall back to the lookup instead.
    const manualId =
      chatroomId != null && /^\d+$/.test(String(chatroomId).trim())
        ? String(chatroomId).trim()
        : null
    let id = manualId
    if (!id) {
      try {
        onStatus?.('connecting', 'looking up chatroom id')
        id = await lookupChatroomId(channel)
      } catch (err) {
        // Cloudflare/CORS most likely. Surface so the UI can prompt for a manual id.
        onStatus?.('lookup-failed', err?.message || 'lookup blocked — enter chatroom ID manually')
        return
      }
    }
    if (closed) return

    socket = createReconnectingSocket({
      url: KICK_PUSHER_URL,
      onStatus,
      // Proactive keepalive; Pusher replies pusher:pong, re-arming the watchdog on idle chats.
      keepAlive: (ws) => ws.send(JSON.stringify({ event: 'pusher:ping', data: {} })),
      onOpen: () => {
        // Wait for pusher:connection_established before subscribing (handled in onMessage).
      },
      onMessage: (event, ws) => {
        let frame
        try {
          frame = JSON.parse(event.data)
        } catch {
          return
        }
        if (frame.event === 'pusher:connection_established') {
          ws.send(
            JSON.stringify({
              event: 'pusher:subscribe',
              data: { channel: `chatrooms.${id}.v2`, auth: '' }, // public channel, empty auth
            }),
          )
          return
        }
        if (frame.event === 'pusher:ping') {
          ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }))
          return
        }
        if (isChatMessageEvent(frame.event)) {
          // IMPORTANT: frame.data is itself a JSON STRING — parse it again.
          let d
          try {
            d = JSON.parse(frame.data)
          } catch {
            return
          }
          onMessage(
            normalize({
              source: 'kick',
              username: d?.sender?.username,
              message: renderEmotes(d?.content),
              timestamp: parseKickTimestamp(d?.created_at),
              id: d?.id,
            }),
          )
        }
      },
    })
  }

  start()

  return {
    close: () => {
      closed = true
      socket?.close()
    },
  }
}
