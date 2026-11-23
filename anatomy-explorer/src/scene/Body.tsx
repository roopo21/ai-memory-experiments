import { useContext, useEffect, useEffectEvent, useMemo, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { damp } from 'maath/easing'
import { structureByMesh } from '../data/anatomy'
import { GUIDE_SYSTEM } from '../data/guides/groups'
import { computeTarget, type GuideStyle } from '../lib/appearance'
import { guideScene } from '../lib/guideView'
import { auditMeshes } from '../lib/auditMeshes'
import { useAnatomyStore } from '../store/useAnatomyStore'
import { assetUrl, DRACO_PATH } from './assets'
import { registerMeshes, meshRegistry, subscribeRegistry, TIER, type Tier } from './registry'
import { BodyPose } from './LivingBody'
import { skinAnatomyMesh, updateSkinBounds } from './movementRig'

useGLTF.setDecoderPath(DRACO_PATH)

const noRaycast = () => {}

interface Runtime {
  mat: THREE.MeshStandardMaterial
  raycast: THREE.Mesh['raycast']
  color: THREE.Color
}

/**
 * A mesh that supersedes a preview continues from the preview's current appearance, so the
 * upgrade reads as the same surface sharpening rather than a fade out and back in.
 */
function adoptAppearance(mesh: THREE.Mesh, replaced: THREE.Object3D | undefined) {
  if (
    !replaced ||
    replaced === mesh ||
    replaced.userData.tier !== TIER.preview ||
    meshRegistry.get(mesh.name) !== mesh
  )
    return
  const from = replaced.userData.rt as Runtime | undefined
  const to = mesh.userData.rt as Runtime
  if (!from) return
  to.mat.opacity = from.mat.opacity
  to.mat.emissiveIntensity = from.mat.emissiveIntensity
  to.mat.depthWrite = from.mat.depthWrite
  to.color.copy(from.color)
  to.mat.color.copy(from.mat.color)
  to.mat.emissive.copy(from.mat.emissive)
  mesh.visible = replaced.visible
  from.mat.opacity = 0
  replaced.visible = false
}

/** Renders any Object3D whose meshes are named per systems.json, applying ghosting/highlighting. */
function BodyView({
  source,
  expected,
  label,
  tier,
  onReady,
}: {
  source: THREE.Object3D
  expected: string[]
  label: string
  tier: Tier
  onReady?: () => void
}) {
  const invalidate = useThree((s) => s.invalidate)
  const rig = useContext(BodyPose)
  const action = useAnatomyStore((s) => s.bodyAction)
  const [rigged, setRigged] = useState(action !== 'idle')
  useEffect(() => {
    if (action !== 'idle') setRigged(true)
  }, [action])
  // Own copy of the scene graph with one material per mesh so each can be animated independently.
  const { root, list: meshList } = useMemo(() => {
    const clone = source.clone(true)
    const list: THREE.Mesh[] = []
    const objects: THREE.Object3D[] = []
    clone.traverse((o) => objects.push(o))
    objects.forEach((o) => {
      if (!(o as THREE.Mesh).isMesh) return
      let m = o as THREE.Mesh
      const mat = new THREE.MeshStandardMaterial({
        color: '#8d96a6',
        roughness: 0.55,
        metalness: 0.05,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      })
      mat.forceSinglePass = true
      m.material = mat
      m.userData.rt = {
        mat,
        raycast: m.raycast,
        color: new THREE.Color('#8d96a6'),
      } satisfies Runtime
      if (rigged && rig) {
        m = skinAnatomyMesh(m, structureByMesh.get(m.name), rig)
        ;(m.userData.rt as Runtime).raycast = m.raycast
      }
      m.renderOrder = 1
      list.push(m)
    })
    return { root: clone, list }
  }, [source, rigged, rig])

  useEffect(() => {
    auditMeshes(
      meshList.map((m) => m.name),
      expected,
      label,
    )
    const replaced = meshList.map((mesh) => meshRegistry.get(mesh.name))
    const unregister = registerMeshes(meshList, tier)
    meshList.forEach((mesh, i) => adoptAppearance(mesh, replaced[i]))
    invalidate()
    return () => {
      unregister()
      for (const mesh of meshList) (mesh.material as THREE.MeshStandardMaterial).dispose()
      for (const mesh of meshList)
        if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) mesh.geometry.dispose()
    }
  }, [meshList, label, invalidate, expected, tier])

  // Fires once per mounted mesh set, whatever the callback's identity.
  const ready = useEffectEvent(() => onReady?.())
  useEffect(() => {
    ready()
  }, [meshList])

  // Any store change wakes the (demand-driven) render loop.
  useEffect(() => useAnatomyStore.subscribe(() => invalidate()), [invalidate])

  useEffect(() => subscribeRegistry(() => invalidate()), [invalidate])
  const tmp = useMemo(() => new THREE.Color(), [])
  useFrame((_, dt) => {
    const state = useAnatomyStore.getState()
    const { layers, hoveredMesh, selectedMesh, isolated, hiddenMeshes } = state
    const scene = guideScene(state)
    let moving = false
    for (const m of meshList) {
      const rt = m.userData.rt as Runtime
      if ((m as THREE.SkinnedMesh).isSkinnedMesh) updateSkinBounds(m as THREE.SkinnedMesh)
      const structure = structureByMesh.get(m.name)
      let guide: GuideStyle | undefined
      if (scene)
        guide = {
          kind: scene.kind,
          role: structure?.systems.includes(GUIDE_SYSTEM[scene.kind])
            ? (scene.roles.get(m.name) ?? 'other')
            : 'context',
          selection: scene.selection,
          exercise: scene.exercise,
        }
      const t = computeTarget(
        structure,
        layers,
        m.name === hoveredMesh,
        m.name === selectedMesh,
        guide,
      )
      if (
        meshRegistry.get(m.name) !== m ||
        hiddenMeshes.includes(m.name) ||
        (isolated && selectedMesh && m.name !== selectedMesh)
      ) {
        t.opacity = 0
        t.visible = false
        t.pickable = false
      }
      const mat = rt.mat
      const before = mat.opacity + mat.emissiveIntensity
      damp(mat, 'opacity', t.opacity, 0.18, dt)
      damp(mat, 'emissiveIntensity', t.emissive, 0.12, dt)
      tmp.set(t.color)
      const dc =
        Math.abs(rt.color.r - tmp.r) + Math.abs(rt.color.g - tmp.g) + Math.abs(rt.color.b - tmp.b)
      if (dc > 0.002) {
        rt.color.lerp(tmp, 1 - Math.exp(-dt / 0.1))
        mat.color.copy(rt.color)
        mat.emissive.copy(rt.color)
        moving = true
      }
      if (
        Math.abs(mat.opacity - t.opacity) > 0.003 ||
        Math.abs(mat.opacity + mat.emissiveIntensity - before) > 1e-4
      )
        moving = true
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
    return () => {
      document.body.style.cursor = ''
    }
  }, [hoveredMesh])

  const nameOf = (e: ThreeEvent<MouseEvent | PointerEvent>) =>
    structureByMesh.has(e.object.name) ? e.object.name : null
  return (
    <primitive
      object={root}
      dispose={null}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        const n = nameOf(e)
        if (useAnatomyStore.getState().hoveredMesh !== n) useAnatomyStore.getState().hover(n)
      }}
      onPointerOut={() => useAnatomyStore.getState().hover(null)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        const n = nameOf(e)
        if (!n) return
        const store = useAnatomyStore.getState()
        // In a guide, a click picks body parts. While an exercise is open the body is read-only.
        if (store.mode === 'explore') store.selectStructure(n)
        else if (!store.activeExercise) store.toggleGuideMesh(n)
      }}
      onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        const n = nameOf(e)
        if (!n) return
        const store = useAnatomyStore.getState()
        if (store.mode === 'explore') store.selectStructure(n, { focus: true })
        else if (!store.activeExercise) store.frameGuideMesh(n)
      }}
    />
  )
}

export function AnatomyLayer({
  url,
  expected,
  tier = TIER.overview,
  onReady,
}: {
  url: string
  expected: string[]
  tier?: Tier
  onReady?: () => void
}) {
  const { scene } = useGLTF(assetUrl(url))
  // Free a preview's GPU buffers when it leaves the scene; three.js re-uploads if it returns.
  useEffect(() => {
    if (tier !== TIER.preview) return
    return () => scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
  }, [scene, tier])
  return <BodyView source={scene} label={url} expected={expected} tier={tier} onReady={onReady} />
}

/** Drop a superseded preview from the loader cache. Only call once it can never render again. */
export const forgetPreview = (url: string) => useGLTF.clear(assetUrl(url))
