import { lazy, Suspense, useEffect, useState } from 'react'
import { systems } from './anatomy/catalogue'
import { library } from './guides/exercises'
import { useAnatomyStore } from './state/useAnatomyStore'
import DetailCard from './ui/DetailCard'
import ExerciseCard from './guides/ui/ExerciseCard'
import SidePanel from './ui/SidePanel'
import { enterStudio, studioUrl } from './studio/navigation'
import Tooltip from './ui/Tooltip'

// The 3D stack (three + r3f + drei) is a separate chunk so the shell paints immediately.
const Scene = lazy(() => import('./viewer/Scene'))
const LoadingBar = lazy(() => import('./ui/LoadingBar')) // imports drei, so it must stay out of the main chunk

/** Shown only until the 3D chunk arrives; afterwards LoadingBar shows real model progress. */
const ChunkLoading = () => (
  <div
    role="progressbar"
    aria-label="Loading viewer"
    className="absolute inset-x-0 top-0 z-50 h-[3px] overflow-hidden bg-white/5"
  >
    <div
      className="h-full w-1/3 bg-[var(--accent)]"
      style={{ animation: 'indeterminate 1.1s ease-in-out infinite' }}
    />
  </div>
)

const PILL = {
  explore: `Male anatomy · ${systems.length} systems`,
  stretch: `Stretch guide · ${library.stretch.length} stretches`,
  glide: `Nerve glides · ${library.glide.length} glides`,
}

const Studio = lazy(() => import('./studio/Studio'))
export default function App() {
  const [route, setRoute] = useState(() => location.search)
  useEffect(() => {
    const changed = () => setRoute(location.search)
    window.addEventListener('popstate', changed)
    return () => window.removeEventListener('popstate', changed)
  }, [])
  if (new URLSearchParams(route).has('studio'))
    return (
      <Suspense fallback={<ChunkLoading />}>
        <Studio key={route}>
          <Scene studio />
        </Studio>
      </Suspense>
    )
  return <Atlas />
}
function Atlas() {
  const mode = useAnatomyStore((s) => s.mode)
  const [motionEnabled, setMotionEnabled] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const changed = () => {
      if (preference.matches) setMotionEnabled(false)
    }
    preference.addEventListener('change', changed)
    return () => preference.removeEventListener('change', changed)
  }, [])
  return (
    <div className="relative h-dvh w-screen overflow-hidden md:pl-[21.5rem]">
      <main className="absolute inset-0" aria-label="3D anatomy viewport">
        <Suspense fallback={null}>
          <Scene motionEnabled={motionEnabled} />
        </Suspense>
      </main>

      <Suspense fallback={<ChunkLoading />}>
        <LoadingBar />
      </Suspense>
      <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 md:left-[calc(50%+10.75rem)]">
        <span className="glass pointer-events-auto inline-flex items-center gap-3 whitespace-nowrap rounded-full px-4 py-2 text-xs">
          {PILL[mode]}
          <button
            type="button"
            aria-label="Animate breathing and body movements"
            aria-pressed={motionEnabled}
            onClick={() => setMotionEnabled((enabled) => !enabled)}
            className="border-l border-white/15 pl-3 text-[var(--muted)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
          >
            {motionEnabled ? 'Pause motion' : 'Play motion'}
          </button>
          <a
            href={studioUrl('push-up').href}
            onClick={(event) => {
              if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
                return
              event.preventDefault()
              enterStudio('push-up')
            }}
            className="border-l border-white/15 pl-3 font-medium underline underline-offset-4"
          >
            Motion Lab
          </a>
        </span>
      </div>
      <DetailCard />
      <ExerciseCard />
      <SidePanel />
      <Tooltip />
      <p className="pointer-events-none absolute bottom-3 left-[calc(50%+10.75rem)] hidden -translate-x-1/2 text-xs text-[var(--muted)]/80 md:block">
        Drag to orbit · scroll to zoom · right-drag to pan · double-click to re-center
      </p>
    </div>
  )
}
