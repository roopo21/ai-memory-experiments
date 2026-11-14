import { useProgress } from '@react-three/drei'

/** Reflects real GLB download progress (drei's useProgress taps three's DefaultLoadingManager). */
export default function LoadingBar() {
  const { active, progress } = useProgress()
  return (
    <div
      role="progressbar"
      aria-label="Loading 3D model"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-hidden={!active}
      className={`pointer-events-none absolute inset-x-0 top-0 z-50 transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="h-[3px] w-full bg-white/5">
        <div className="h-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)] transition-[width] duration-200" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-center text-xs tracking-wide text-[var(--muted)]">Loading model… {Math.round(progress)}%</p>
    </div>
  )
}
