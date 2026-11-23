import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react'
import { Html } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { mountedLayerSources, structureByMesh, type LayerSource } from '../data/anatomy'
import { HOME } from '../lib/framing'
import { useAnatomyStore } from '../store/useAnatomyStore'
import { assetUrl, previewUrlOf } from './assets'
import CameraRig from './CameraRig'
import LivingBody from './LivingBody'
import MovementShadows from './MovementShadows'
import { AnatomyLayer, forgetPreview } from './Body'
import {
  fullFailed,
  fullLoaded,
  previewSettled,
  previewStarted,
  useFullAdmission,
  useFullLoaded,
} from './loadQueue'
import { TIER } from './registry'

class ModelBoundary extends Component<
  { fallback: ReactNode; children: ReactNode; onError?: () => void },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(e: unknown) {
    console.warn('[models] Requested anatomy layer failed to load.', e)
    this.props.onError?.()
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

const Alert = ({ children }: { children: ReactNode }) => (
  <Html center>
    <p role="alert" className="rounded bg-slate-900 p-3 text-white">
      {children}
    </p>
  </Html>
)

/** The default view is covered by muscle, so visible surfaces upgrade before the skeleton. */
const priorityOf = (layer: LayerSource) => (layer.systems.includes('skeletal') ? 1 : 0)
const labelOf = (layer: LayerSource) =>
  layer.systems.includes('muscular') ? `${layer.region} muscles` : layer.region

/**
 * Paints a layer from its lightweight preview, then swaps in the full-quality GLB once the load
 * queue admits it. Both tiers register the same mesh names; the registry shows the best one.
 */
function ProgressiveLayer({ layer }: { layer: LayerSource }) {
  const previewUrl = previewUrlOf(layer.url)
  const upgraded = useFullLoaded(layer.url)
  const showPreview = previewUrl !== undefined && !upgraded

  // Registered before the full request so the queue already sees this preview as downloading.
  useEffect(() => {
    if (previewUrl === undefined) return
    if (upgraded) {
      forgetPreview(previewUrl) // the full layer now serves this layer for good
      return
    }
    previewStarted(previewUrl, assetUrl(previewUrl))
    return () => previewSettled(previewUrl)
  }, [upgraded, previewUrl])
  const admitted = useFullAdmission(
    layer.url,
    priorityOf(layer),
    previewUrl !== undefined,
    assetUrl(layer.url),
  )

  return (
    <>
      {previewUrl !== undefined && !upgraded && (
        <Suspense fallback={null}>
          <ModelBoundary fallback={null} onError={() => previewSettled(previewUrl)}>
            <AnatomyLayer
              url={previewUrl}
              expected={layer.meshes}
              tier={TIER.preview}
              onReady={() => previewSettled(previewUrl)}
            />
          </ModelBoundary>
        </Suspense>
      )}
      {(admitted || previewUrl === undefined) && (
        <Suspense fallback={null}>
          <ModelBoundary
            fallback={
              <Alert>
                {showPreview
                  ? `${labelOf(layer)}: full detail failed to load; showing a simplified surface. Reload to retry.`
                  : `${labelOf(layer)} failed to load. Reload to retry.`}
              </Alert>
            }
            onError={() => fullFailed(layer.url)}
          >
            <AnatomyLayer
              url={layer.url}
              expected={layer.meshes}
              onReady={() => fullLoaded(layer.url)}
            />
          </ModelBoundary>
        </Suspense>
      )}
    </>
  )
}

function Stage() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#bcd4ff', '#1a2030', 0.7]} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} />
      <directionalLight position={[-4, 2, -3]} intensity={1.1} color="#6fb8ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <ringGeometry args={[0.9, 0.905, 96]} />
        <meshBasicMaterial color="#5fd4f4" transparent opacity={0.16} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]}>
        <circleGeometry args={[0.9, 64]} />
        <meshBasicMaterial color="#5fd4f4" transparent opacity={0.06} />
      </mesh>
    </>
  )
}

export default function Scene({ motionEnabled = true }: { motionEnabled?: boolean }) {
  const layers = useAnatomyStore((s) => s.layers)
  const selected = useAnatomyStore((s) => s.selectedMesh)
  const detail = selected ? structureByMesh.get(selected) : null
  const detailNames = useMemo(() => (detail ? [detail.meshName] : []), [detail?.meshName])
  const muscleRegion = useAnatomyStore((s) => s.muscleRegion)

  const mounted = mountedLayerSources((id) => layers[id].visible, muscleRegion)

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 38, near: 0.05, far: 60, position: HOME.position.toArray() }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onPointerMissed={(e) => {
        const store = useAnatomyStore.getState()
        if (e.detail >= 2)
          store.recenter() // double-click on empty space
        else if (store.mode === 'explore') store.clearSelection() // a stray click never drops a guide selection
      }}
      aria-label="3D human anatomy viewport"
    >
      <Stage />
      <CameraRig />
      <LivingBody enabled={motionEnabled}>
        <MovementShadows />
        {mounted.map((layer) => (
          <ProgressiveLayer key={layer.url} layer={layer} />
        ))}
        {detail?.detailUrl && detail.systems.some((id) => layers[id].visible) && (
          <Suspense fallback={null}>
            <ModelBoundary
              key={detail.meshName}
              fallback={<Alert>Full detail unavailable. Showing overview surface.</Alert>}
            >
              <AnatomyLayer url={detail.detailUrl} expected={detailNames} tier={TIER.detail} />
            </ModelBoundary>
          </Suspense>
        )}
      </LivingBody>
    </Canvas>
  )
}
