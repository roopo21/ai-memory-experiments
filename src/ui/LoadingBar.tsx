import { useProgress } from '@react-three/drei'
import { useLoadState } from '../viewer/loadQueue'

/**
 * Reflects real GLB download progress (drei's useProgress taps three's DefaultLoadingManager).
 * Once the previews are on screen the remaining full-quality downloads are background work,
 * so the bar turns into a quiet indeterminate indicator instead of blocking-looking progress.
 */
export default function LoadingBar() {
  const { active, progress } = useProgress()
  const { previewsLoading, fullActive, fullWaiting } = useLoadState()
  const refining = previewsLoading === 0 && fullActive + fullWaiting > 0
  const busy = active || previewsLoading > 0 || refining
  return (
    <div
      role="progressbar"
      aria-label={refining ? 'Loading full-detail anatomy' : 'Loading 3D model'}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={refining ? undefined : Math.round(progress)}
      aria-hidden={!busy}
      className={`pointer-events-none absolute inset-x-0 top-0 z-50 transition-opacity duration-500 ${busy ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="h-[3px] w-full overflow-hidden bg-white/5">
        {refining ? (
          <div
            className="h-full w-1/3 bg-[var(--accent)] opacity-60"
            style={{ animation: 'indeterminate 1.6s ease-in-out infinite' }}
          />
        ) : (
          <div
            className="h-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)] transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        )}
      </div>
      <p className="mt-3 text-center text-xs tracking-wide text-[var(--muted)]">
        {refining ? 'Loading full detail…' : `Loading model… ${Math.round(progress)}%`}
      </p>
    </div>
  )
}
