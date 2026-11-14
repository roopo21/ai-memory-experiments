import { Component, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react'
import { Html } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import type { Sex } from '../data/anatomy'
import { HOME } from '../lib/framing'
import { useAnatomyStore } from '../store/useAnatomyStore'
import CameraRig from './CameraRig'
import { FallbackBody, GltfBody, Preload } from './Body'

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(e: unknown) { console.warn('[models] GLB failed to load, using procedural placeholder.', e) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

/** Fallback for a failed preload: just report ready so the swap proceeds with the procedural body. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady])
  return null
}

function Stage() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#bcd4ff', '#1a2030', 0.7]} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} />
      <directionalLight position={[-4, 2, -3]} intensity={1.1} color="#6fb8ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <ringGeometry args={[0.55, 0.57, 96]} />
        <meshBasicMaterial color="#5fd4f4" transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]}>
        <circleGeometry args={[0.55, 64]} />
        <meshBasicMaterial color="#5fd4f4" transparent opacity={0.04} />
      </mesh>
    </>
  )
}

export default function Scene() {
  const mode = useAnatomyStore(s => s.mode)
  const sex = useAnatomyStore((s) => s.sex)
  // Keep showing the old body until the new one is fully loaded, then swap (no blank flash).
  const [shown, setShown] = useState<Sex>(sex)
  const onReady = useCallback(() => setShown(useAnatomyStore.getState().sex), [])

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 38, near: 0.05, far: 60, position: HOME.position.toArray() }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onPointerMissed={(e) => {
        if (e.detail >= 2) useAnatomyStore.getState().recenter() // double-click on empty space
        else useAnatomyStore.getState().clearSelection()
      }}
      aria-label="3D human anatomy viewport"
    >
      <Stage />
      <CameraRig />
      <Suspense fallback={null}>
        <ModelBoundary key={`${shown}-${mode}`} fallback={mode === 'skeleton' ? <Html center><p role="alert" className="rounded-xl bg-slate-900 p-4 text-white">Skeleton could not load. Reload to retry.</p></Html> : <FallbackBody sex={shown} />}>
          <GltfBody sex={mode === 'skeleton' ? 'male' : shown} mode={mode} />
        </ModelBoundary>
      </Suspense>
      {sex !== shown && (
        <Suspense fallback={null}>
          <ModelBoundary key={`pre-${sex}`} fallback={<Ready onReady={onReady} />}>
            <Preload sex={sex} onReady={onReady} />
          </ModelBoundary>
        </Suspense>
      )}
    </Canvas>
  )
}
