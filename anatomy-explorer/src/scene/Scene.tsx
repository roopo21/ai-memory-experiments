import { Component, Suspense, useMemo, type ReactNode } from 'react'
import { Html } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import {
  skeletonNames,
  muscleChunks,
  organChunks,
  structureByMesh,
  type SystemId,
} from '../data/anatomy'
import { HOME } from '../lib/framing'
import { useAnatomyStore } from '../store/useAnatomyStore'
import CameraRig from './CameraRig'
import { AnatomyLayer } from './Body'

class ModelBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(e: unknown) {
    console.warn('[models] Requested anatomy layer failed to load.', e)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
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
  const layers = useAnatomyStore((s) => s.layers)
  const selected = useAnatomyStore((s) => s.selectedMesh)
  const detail = selected ? structureByMesh.get(selected) : null
  const detailNames = useMemo(() => (detail ? [detail.meshName] : []), [detail?.meshName])
  const muscleVisible = useAnatomyStore((s) => s.layers.muscular.visible)
  const muscleRegion = useAnatomyStore((s) => s.muscleRegion)

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 38, near: 0.05, far: 60, position: HOME.position.toArray() }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onPointerMissed={(e) => {
        if (e.detail >= 2)
          useAnatomyStore.getState().recenter() // double-click on empty space
        else useAnatomyStore.getState().clearSelection()
      }}
      aria-label="3D human anatomy viewport"
    >
      <Stage />
      <CameraRig />
      <>
        <Suspense fallback={null}>
          <ModelBoundary
            fallback={
              <Html center>
                <p role="alert">Skeleton failed to load. Reload to retry.</p>
              </Html>
            }
          >
            <AnatomyLayer url="/models/male-skeleton.glb" expected={skeletonNames} />
          </ModelBoundary>
        </Suspense>
        {muscleVisible &&
          muscleChunks
            .filter((c) => !muscleRegion || c.region === muscleRegion)
            .map((chunk) => (
              <Suspense key={chunk.url} fallback={null}>
                <ModelBoundary
                  fallback={
                    <Html center>
                      <p role="alert" className="rounded bg-slate-900 p-3 text-white">
                        {chunk.region} muscles failed to load. Reload to retry.
                      </p>
                    </Html>
                  }
                >
                  <AnatomyLayer url={chunk.url} expected={chunk.meshes} />
                </ModelBoundary>
              </Suspense>
            ))}
        {organChunks
          .filter((chunk) => chunk.systems.some((id) => layers[id as SystemId].visible))
          .map((chunk) => (
            <Suspense key={chunk.url} fallback={null}>
              <ModelBoundary
                fallback={
                  <Html center>
                    <p role="alert">{chunk.region} failed to load. Reload to retry.</p>
                  </Html>
                }
              >
                <AnatomyLayer url={chunk.url} expected={chunk.meshes} />
              </ModelBoundary>
            </Suspense>
          ))}
        {detail?.detailUrl && detail.systems.some((id) => layers[id].visible) && (
          <Suspense fallback={null}>
            <ModelBoundary
              key={detail.meshName}
              fallback={
                <Html center>
                  <p role="alert">Full detail unavailable. Showing overview surface.</p>
                </Html>
              }
            >
              <AnatomyLayer url={detail.detailUrl} expected={detailNames} detail />
            </ModelBoundary>
          </Suspense>
        )}
      </>
    </Canvas>
  )
}
