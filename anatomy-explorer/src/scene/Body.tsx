import { useEffect, useMemo } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { damp } from 'maath/easing'
import { structureByMesh, type Sex, type ModelMode } from '../data/anatomy'
import { computeTarget } from '../lib/appearance'
import { auditMeshes } from '../lib/auditMeshes'
import { useAnatomyStore } from '../store/useAnatomyStore'
import { meshRegistry } from './registry'
import { buildPlaceholderBody } from './placeholderBody'

useGLTF.setDecoderPath('/draco/')

export const modelUrl = (sex: Sex, mode: ModelMode = 'overview') => mode === 'skeleton' ? '/models/male-skeleton.glb' : `/models/${sex}.glb`
const noRaycast = () => {}

interface Runtime { mat: THREE.MeshStandardMaterial; raycast: THREE.Mesh['raycast']; color: THREE.Color }

/** Renders any Object3D whose meshes are named per systems.json, applying ghosting/highlighting. */
function BodyView({ source, sex, mode = 'overview' }: { source: THREE.Object3D; sex: Sex; mode?: ModelMode }) {
  const invalidate = useThree((s) => s.invalidate)
  // Own copy of the scene graph with one material per mesh so each can be animated independently.
  const { root, list: meshList } = useMemo(() => {
    const clone = source.clone(true)
    const list: THREE.Mesh[] = []
    clone.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return
      const m = o as THREE.Mesh
      const mat = new THREE.MeshStandardMaterial({ color: '#8d96a6', roughness: 0.55, metalness: 0.05, transparent: true, opacity: 0, side: THREE.DoubleSide })
      m.material = mat
      m.userData.rt = { mat, raycast: m.raycast, color: new THREE.Color('#8d96a6') } satisfies Runtime
      m.renderOrder = 1
      list.push(m)
    })
    return { root: clone, list }
  }, [source])

  useEffect(() => {
    auditMeshes(meshList.map((m) => m.name), sex, mode, mode)
    meshRegistry.clear()
    for (const m of meshList) meshRegistry.set(m.name, m)
    invalidate()
    return () => meshRegistry.clear()
  }, [meshList, sex, mode, invalidate])

  // Any store change wakes the (demand-driven) render loop.
  useEffect(() => useAnatomyStore.subscribe(() => invalidate()), [invalidate])

  const tmp = useMemo(() => new THREE.Color(), [])
  useFrame((_, dt) => {
    const { activeSystems, layers, hoveredMesh, selectedMesh, isolated } = useAnatomyStore.getState()
    let moving = false
    for (const m of meshList) {
      const rt = m.userData.rt as Runtime
      const t = computeTarget(structureByMesh.get(m.name), activeSystems, layers, m.name === hoveredMesh, m.name === selectedMesh)
      if (mode === 'skeleton') { t.color = m.name === selectedMesh ? '#c4ad82' : '#d6c6a6'; t.emissive = m.name === hoveredMesh ? 0.06 : 0 }
      if (isolated && selectedMesh && m.name !== selectedMesh) { t.opacity = 0; t.visible = false; t.pickable = false }
      const mat = rt.mat
      const before = mat.opacity + mat.emissiveIntensity
      damp(mat, 'opacity', t.opacity, 0.18, dt)
      damp(mat, 'emissiveIntensity', t.emissive, 0.12, dt)
      tmp.set(t.color)
      const dc = Math.abs(rt.color.r - tmp.r) + Math.abs(rt.color.g - tmp.g) + Math.abs(rt.color.b - tmp.b)
      if (dc > 0.002) {
        rt.color.lerp(tmp, 1 - Math.exp(-dt / 0.1))
        mat.color.copy(rt.color)
        mat.emissive.copy(rt.color)
        moving = true
      }
      if (Math.abs(mat.opacity - t.opacity) > 0.003 || Math.abs(mat.opacity + mat.emissiveIntensity - before) > 1e-4) moving = true
      else mat.opacity = t.opacity
      mat.depthWrite = mat.opacity > 0.85
      m.visible = t.visible || mat.opacity > 0.01
      m.raycast = t.pickable ? rt.raycast : noRaycast
    }
    if (moving) invalidate()
  })

  const hoveredMesh = useAnatomyStore((s) => s.hoveredMesh)
  useEffect(() => {
    document.body.style.cursor = hoveredMesh ? 'pointer' : ''
    return () => { document.body.style.cursor = '' }
  }, [hoveredMesh])

  const nameOf = (e: ThreeEvent<MouseEvent | PointerEvent>) => (structureByMesh.has(e.object.name) ? e.object.name : null)
  return (
    <primitive
      object={root}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        const n = nameOf(e)
        if (useAnatomyStore.getState().hoveredMesh !== n) useAnatomyStore.getState().hover(n)
      }}
      onPointerOut={() => useAnatomyStore.getState().hover(null)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        const n = nameOf(e)
        if (n) useAnatomyStore.getState().selectStructure(n)
      }}
      onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        const n = nameOf(e)
        if (n) useAnatomyStore.getState().selectStructure(n, { focus: true })
      }}
    />
  )
}

export function GltfBody({ sex, mode }: { sex: Sex; mode: ModelMode }) {
  const { scene } = useGLTF(modelUrl(sex, mode))
  return <BodyView source={scene} sex={sex} mode={mode} />
}

/** Used if a GLB is missing or corrupt, so the app stays testable. */
export function FallbackBody({ sex }: { sex: Sex }) {
  const source = useMemo(() => buildPlaceholderBody(sex), [sex])
  return <BodyView source={source} sex={sex} />
}

/** Suspends until the model is cached, then reports ready. Renders nothing. */
export function Preload({ sex, onReady }: { sex: Sex; onReady: () => void }) {
  useGLTF(modelUrl(sex))
  useEffect(onReady, [onReady])
  return null
}
