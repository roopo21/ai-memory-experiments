import { useEffect, useSyncExternalStore } from 'react'

/**
 * Progressive loading policy, independent of React and three so it can be unit-checked.
 *
 * - A layer shows its small preview first; its full-quality GLB waits in a queue.
 * - Full downloads start once every pending preview has finished downloading (Resource Timing),
 *   so previews never share bandwidth with heavy files. A preview that takes longer than
 *   PREVIEW_GRACE_MS stops blocking.
 * - Strict priority classes: a class starts only when no better class is waiting or downloading,
 *   so the visible surfaces finish before the mostly hidden skeleton begins. At most
 *   MAX_ACTIVE downloads run at once.
 */
export const MAX_ACTIVE = 12
export const PREVIEW_GRACE_MS = 6000

const pendingPreviews = new Map<string, { started: number; resource?: string }>()
const waiting: { url: string; priority: number; resource?: string; seq: number }[] = []
const active = new Map<string, { priority: number; resource?: string }>()
const admitted = new Set<string>()
const loaded = new Set<string>()
let seq = 0
let revision = 0
let graceTimer: ReturnType<typeof setTimeout> | undefined
let pumpScheduled = false
let observer: PerformanceObserver | undefined
const listeners = new Set<() => void>()

const notify = () => {
  revision++
  listeners.forEach((fn) => fn())
}

/** Decide after the current commit's effects have all registered, so priority order holds. */
function schedulePump() {
  if (pumpScheduled) return
  pumpScheduled = true
  queueMicrotask(() => {
    pumpScheduled = false
    pump()
  })
}

/** Bytes have arrived (often via the index.html preload) even if decoding is still under way. */
function downloaded(resource: string | undefined) {
  if (!resource || typeof location === 'undefined') return false
  return performance
    .getEntriesByName(new URL(resource, location.href).href)
    .some((entry) => (entry as PerformanceResourceTiming).responseEnd > 0)
}

function pump() {
  const now = Date.now()
  let blocking = 0
  let nextExpiry = Infinity
  for (const { started, resource } of pendingPreviews.values()) {
    if (now - started < PREVIEW_GRACE_MS && !downloaded(resource)) {
      blocking++
      nextExpiry = Math.min(nextExpiry, started + PREVIEW_GRACE_MS)
    }
  }
  clearTimeout(graceTimer)
  if (blocking) {
    graceTimer = setTimeout(pump, nextExpiry - now + 1)
    return
  }
  let changed = false
  waiting.sort((a, b) => a.priority - b.priority || a.seq - b.seq)
  while (waiting.length && active.size < MAX_ACTIVE) {
    // A better class blocks only until its bytes arrive; its decoding can overlap the next download.
    const busy = [...active.values()].filter((a) => !downloaded(a.resource)).map((a) => a.priority)
    if (waiting[0].priority > Math.min(...busy, waiting[0].priority)) break
    const { url, priority, resource } = waiting.shift()!
    active.set(url, { priority, resource })
    admitted.add(url)
    changed = true
  }
  if (changed) notify()
}

/** `resource` is the URL actually fetched, used to notice when its download completes. */
export function previewStarted(url: string, resource?: string) {
  if (!pendingPreviews.has(url)) pendingPreviews.set(url, { started: Date.now(), resource })
  if (!observer && resource && typeof PerformanceObserver !== 'undefined') {
    observer = new PerformanceObserver(() => {
      if (waiting.length) schedulePump()
    })
    observer.observe({ type: 'resource' })
  }
  notify()
  schedulePump()
}

/** The preview rendered, failed, or is no longer wanted. */
export function previewSettled(url: string) {
  if (!pendingPreviews.delete(url)) return
  notify()
  schedulePump()
}

export function requestFull(url: string, priority: number, resource?: string) {
  if (loaded.has(url) || admitted.has(url) || waiting.some((w) => w.url === url)) return
  waiting.push({ url, priority, resource, seq: seq++ })
  notify()
  schedulePump()
}

/** The layer unmounted: free its slot and forget the request unless it already loaded. */
export function releaseFull(url: string) {
  const index = waiting.findIndex((w) => w.url === url)
  if (index >= 0) waiting.splice(index, 1)
  if (!loaded.has(url)) admitted.delete(url)
  active.delete(url)
  notify()
  schedulePump()
}

/** The full asset errored: free its download slot but keep it admitted so its error stays visible. */
export function fullFailed(url: string) {
  active.delete(url)
  notify()
  schedulePump()
}

export function fullLoaded(url: string) {
  loaded.add(url)
  active.delete(url)
  notify()
  schedulePump()
}

export const isFullLoaded = (url: string) => loaded.has(url)
export const isFullAdmitted = (url: string) => admitted.has(url) || loaded.has(url)
export const loadState = () => ({
  previewsLoading: pendingPreviews.size,
  fullActive: active.size,
  fullWaiting: waiting.length,
})

export function resetLoadQueue() {
  pendingPreviews.clear()
  waiting.length = 0
  active.clear()
  admitted.clear()
  loaded.clear()
  clearTimeout(graceTimer)
  notify()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const snapshot = () => revision
const useRevision = () => useSyncExternalStore(subscribe, snapshot, snapshot)

/** Whether `url`'s full-quality layer may mount; queues it while `enabled`. */
export function useFullAdmission(
  url: string,
  priority: number,
  enabled: boolean,
  resource?: string,
) {
  useRevision()
  useEffect(() => {
    if (!enabled) return
    requestFull(url, priority, resource)
    return () => releaseFull(url)
  }, [url, priority, enabled, resource])
  return isFullAdmitted(url)
}

export function useFullLoaded(url: string) {
  useRevision()
  return isFullLoaded(url)
}

export function useLoadState() {
  useRevision()
  return loadState()
}
