import { useSyncExternalStore } from 'react'
import { store } from '../lib/chatStore.js'

// Each hook subscribes to the same store but reads a different slice. The store keeps each
// slice's reference stable between changes, so a component only re-renders when ITS slice
// actually changes (messages on flush, feeds on status change, snapshot every tick).
export function useMessages() {
  return useSyncExternalStore(store.subscribe, store.getMessages)
}

export function useFeeds() {
  return useSyncExternalStore(store.subscribe, store.getFeeds)
}

export function useEngineSnapshot() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}

export function useSubCount() {
  return useSyncExternalStore(store.subscribe, store.getSubCount)
}

export function useSubEvents() {
  return useSyncExternalStore(store.subscribe, store.getSubEvents)
}
