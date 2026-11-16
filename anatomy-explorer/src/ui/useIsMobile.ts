import { useSyncExternalStore } from 'react'

const Q = '(max-width: 767px)'
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(Q)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
export const useIsMobile = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(Q).matches,
    () => false,
  )
