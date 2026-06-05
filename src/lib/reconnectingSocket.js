import {
  RECONNECT_BASE_MS,
  RECONNECT_MAX_MS,
  HEARTBEAT_TIMEOUT_MS,
  KEEPALIVE_MS,
} from './constants.js'

// A WebSocket wrapper with exponential-backoff + jitter reconnection, a heartbeat watchdog
// (forces a reconnect if no inbound traffic for HEARTBEAT_TIMEOUT_MS), and an optional client
// keepalive so idle-but-healthy sockets keep producing inbound traffic and don't trip the
// watchdog.
//   - `url`: a string, or a function returning a string (re-evaluated on each connect).
//   - `onOpen(ws)`: runs on every (re)connection — do your handshake/subscribe here.
//   - `onMessage(event, ws)`: per inbound frame. Throwing here is caught.
//   - `onStatus(status, detail)`: connecting | open | reconnecting | closed | error.
//   - `keepAlive(ws)`: optional; called every KEEPALIVE_MS while OPEN to send a platform ping
//      whose reply re-arms the heartbeat watchdog (prevents reconnect churn on quiet channels).
export function createReconnectingSocket({ url, onOpen, onMessage, onStatus, protocols, keepAlive }) {
  let ws = null
  let attempt = 0
  let manuallyClosed = false
  let closedEmitted = false
  let reconnectTimer = null
  let heartbeatTimer = null
  let keepAliveTimer = null

  const status = (s, detail) => {
    try {
      onStatus?.(s, detail)
    } catch {
      /* ignore status handler errors */
    }
  }

  function armHeartbeat() {
    clearTimeout(heartbeatTimer)
    heartbeatTimer = setTimeout(() => {
      // No inbound traffic for too long — assume dead; closing triggers onclose -> reconnect.
      if (ws) {
        try {
          ws.close()
        } catch {
          /* ignore */
        }
      }
    }, HEARTBEAT_TIMEOUT_MS)
  }

  function startKeepAlive() {
    clearInterval(keepAliveTimer)
    if (!keepAlive) return
    keepAliveTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          keepAlive(ws)
        } catch {
          /* ignore keepalive errors */
        }
      }
    }, KEEPALIVE_MS)
  }

  function clearLiveTimers() {
    clearTimeout(heartbeatTimer)
    clearInterval(keepAliveTimer)
  }

  function emitClosedOnce() {
    if (closedEmitted) return
    closedEmitted = true
    status('closed')
  }

  function connect() {
    if (manuallyClosed) return
    const target = typeof url === 'function' ? url() : url
    status(attempt === 0 ? 'connecting' : 'reconnecting')
    try {
      ws = protocols ? new WebSocket(target, protocols) : new WebSocket(target)
    } catch {
      scheduleReconnect()
      return
    }

    ws.addEventListener('open', () => {
      attempt = 0
      armHeartbeat()
      startKeepAlive()
      status('open')
      try {
        onOpen?.(ws)
      } catch (err) {
        // Handshake failed on a live socket — close it so onclose schedules a reconnect,
        // instead of leaving a dead-but-open socket until the watchdog eventually fires.
        status('error', String(err))
        try {
          ws.close()
        } catch {
          /* ignore */
        }
      }
    })

    ws.addEventListener('message', (event) => {
      armHeartbeat()
      try {
        onMessage?.(event, ws)
      } catch {
        /* one bad frame must not kill the socket */
      }
    })

    ws.addEventListener('error', () => status('error'))

    ws.addEventListener('close', () => {
      clearLiveTimers()
      if (manuallyClosed) {
        emitClosedOnce()
        return
      }
      scheduleReconnect()
    })
  }

  function scheduleReconnect() {
    if (manuallyClosed) return
    clearLiveTimers()
    const backoff = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt)
    const jitter = backoff * 0.25 * Math.random()
    attempt++
    status('reconnecting')
    clearTimeout(reconnectTimer)
    // Cap the TOTAL delay (base + jitter) at RECONNECT_MAX_MS, not just the base.
    reconnectTimer = setTimeout(connect, Math.min(RECONNECT_MAX_MS, backoff + jitter))
  }

  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data)
      return true
    }
    return false
  }

  function close() {
    manuallyClosed = true
    clearTimeout(reconnectTimer)
    clearLiveTimers()
    if (ws) {
      try {
        ws.close()
      } catch {
        /* ignore */
      }
    }
    // Emit 'closed' once. If a real socket exists it also fires 'close' -> emitClosedOnce,
    // but the guard dedupes; this call covers the never-connected case.
    emitClosedOnce()
  }

  connect()
  return { send, close, getSocket: () => ws }
}
