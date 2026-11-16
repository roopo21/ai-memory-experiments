import { lazy, Suspense } from 'react'
import DetailCard from './ui/DetailCard'
import SidePanel from './ui/SidePanel'
import Tooltip from './ui/Tooltip'

// The 3D stack (three + r3f + drei) is a separate chunk so the shell paints immediately.
const Scene = lazy(() => import('./scene/Scene'))
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

export default function App() {
  return (
    <div className="relative h-dvh w-screen overflow-hidden md:pl-[21.5rem]">
      <main className="absolute inset-0" aria-label="3D anatomy viewport">
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </main>

      <Suspense fallback={<ChunkLoading />}>
        <LoadingBar />
      </Suspense>
      <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 md:left-[calc(50%+10.75rem)]">
        <div className="pointer-events-auto">
          <span className="glass inline-block whitespace-nowrap rounded-full px-4 py-2 text-xs">
            Male anatomy · bones + muscles
          </span>
        </div>
      </div>
      <DetailCard />
      <SidePanel />
      <Tooltip />
      <p className="pointer-events-none absolute bottom-3 left-[calc(50%+10.75rem)] hidden -translate-x-1/2 text-xs text-[var(--muted)]/80 md:block">
        Drag to orbit · scroll to zoom · right-drag to pan · double-click to re-center
      </p>
    </div>
  )
}
