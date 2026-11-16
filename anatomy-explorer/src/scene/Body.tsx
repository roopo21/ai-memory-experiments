import { useEffect, useMemo } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { damp } from 'maath/easing'
import { structureByMesh } from '../data/anatomy'
import { computeTarget } from '../lib/appearance'
import { auditMeshes } from '../lib/auditMeshes'
import { useAnatomyStore } from '../store/useAnatomyStore'
import { registerMeshes, meshRegistry, subscribeRegistry } from './registry'

useGLTF.setDecoderPath('/draco/')

const noRaycast = () => {}

interface Runtime {
  mat: THREE.MeshStandardMaterial
  raycast: THREE.Mesh['raycast']
  color: THREE.Color
}

/** Renders any Object3D whose meshes are named per systems.json, applying ghosting/highlighting. */
function BodyView({
  source,
  expected,
  label,
  detail = false,
}: {
  source: THREE.Object3D
  expected: string[]
  label: string
  detail?: boolean
}) {
  const invalidate = useThree((s) => s.invalidate)
  // Own copy of the scene graph with one material per mesh so each can be animated independently.
  const { root, list: meshList } = useMemo(() => {
    const clone = source.clone(true)
    const list: THREE.Mesh[] = []
    clone.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return
      const m = o as THREE.Mesh
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
      m.renderOrder = 1
      list.push(m)
    })
    return { root: clone, list }
  }, [source])

  useEffect(() => {
    auditMeshes(
      meshList.map((m) => m.name),
      expected,
      label,
    )
    const unregister = registerMeshes(meshList, detail)
    invalidate()
    return () => {
      unregister()
      for (const mesh of meshList) (mesh.material as THREE.MeshStandardMaterial).dispose()
    }
  }, [meshList, label, invalidate, expected, detail])

  // Any store change wakes the (demand-driven) render loop.
  useEffect(() => useAnatomyStore.subscribe(() => invalidate()), [invalidate])

  useEffect(() => subscribeRegistry(() => invalidate()), [invalidate])
  const tmp = useMemo(() => new THREE.Color(), [])
  useFrame((_, dt) => {
    const { layers, hoveredMesh, selectedMesh, isolated, hiddenMeshes } = useAnatomyStore.getState()
    let moving = false
    for (const m of meshList) {
      const rt = m.userData.rt as Runtime
      const t = computeTarget(
        structureByMesh.get(m.name),
        layers,
        m.name === hoveredMesh,
        m.name === selectedMesh,
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

export function AnatomyLayer({
  url,
  expected,
  detail = false,
}: {
  url: string
  expected: string[]
  detail?: boolean
}) {
  const { scene } = useGLTF(url)
  return <BodyView source={scene} label={url} expected={expected} detail={detail} />
}
