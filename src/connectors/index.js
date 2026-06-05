import { createTwitchConnector } from './twitch.js'
import { createKickConnector } from './kick.js'
import { createXConnector } from './x.js'

// Registry: source -> factory({ channel, chatroomId?, onMessage, onStatus }) -> { close() }.
// All connectors share this interface so the store can dispatch by source uniformly.
export const CONNECTORS = {
  twitch: createTwitchConnector,
  kick: createKickConnector,
  x: createXConnector,
}
