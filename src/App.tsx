import { lazy, Suspense, useEffect, useState } from 'react'
import { library } from './guides/exercises'
import { useAnatomyStore } from './state/useAnatomyStore'
import DetailCard from './ui/DetailCard'
import ExerciseCard from './guides/ui/ExerciseCard'
import SidePanel from './ui/SidePanel'
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
  explore: 'Male anatomy · 7 systems',
  stretch: `Stretch guide · ${library.stretch.length} stretches`,
  glide: `Nerve glides · ${library.glide.length} glides`,
}

export default function App() {
  const mode = useAnatomyStore((s) => s.mode)
  const bodyAction = useAnatomyStore((s) => s.bodyAction)
  const setBodyAction = useAnatomyStore((s) => s.setBodyAction)
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
      <div aria-hidden="true" className="viewer-brand">
        vrisha labs
      </div>
      <main className="absolute inset-0" aria-label="3D anatomy viewport">
        <Suspense fallback={null}>
          <Scene motionEnabled={motionEnabled} />
        </Suspense>
      </main>

      <Suspense fallback={<ChunkLoading />}>
        <LoadingBar />
      </Suspense>
      <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 md:left-[calc(50%+10.75rem)]">
        <div className="pointer-events-auto flex flex-col items-center gap-2">
          <span className="glass inline-flex items-center gap-3 whitespace-nowrap rounded-full px-4 py-2 text-xs">
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
          </span>
          <div
            role="group"
            aria-label="Body movements"
            className="flex max-w-[calc(100vw-1rem)] flex-wrap justify-center gap-2"
          >
            {(
              [
                ['wheel', 'Yoga backbend'],
                ['moonwalk', 'Moonwalk'],
                ['cartwheel', 'Cartwheel'],
              ] as const
            ).map(([action, label]) => (
              <button
                key={action}
                type="button"
                aria-pressed={bodyAction === action}
                onClick={() => {
                  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
                    setMotionEnabled(true)
                  setBodyAction(bodyAction === action && action !== 'cartwheel' ? 'idle' : action)
                }}
                className={`glass rounded-full border px-3 py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] ${bodyAction === action ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-white/15 hover:bg-white/10'}`}
              >
                {label}
              </button>
            ))}
            {bodyAction !== 'idle' && (
              <button
                type="button"
                onClick={() => {
                  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
                    setMotionEnabled(true)
                  setBodyAction('idle')
                }}
                className="glass rounded-full border border-white/15 px-3 py-2 text-xs hover:bg-white/10"
              >
                Stand upright
              </button>
            )}
          </div>
        </div>
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
