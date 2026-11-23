import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { damp3 } from 'maath/easing'
import { structures } from '../data/anatomy'
import { HOME } from '../lib/framing'
import { useAnatomyStore } from '../store/useAnatomyStore'
import { meshRegistry, subscribeRegistry, registrySnapshot } from './registry'

const FOCUS_DIR_BIAS = new THREE.Vector3(0, 0.1, 1)
/** The body faces +Z and its left side is +X. */
const VIEW_DIR = {
  front: new THREE.Vector3(0, 0.12, 1).normalize(),
  back: new THREE.Vector3(0, 0.12, -1).normalize(),
  side: new THREE.Vector3(1, 0.1, 0.3).normalize(),
}

export default function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const invalidate = useThree((s) => s.invalidate)
  const controls = useRef<{ target: THREE.Vector3; update: () => void } | null>(null)
  const goal = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null)
  const registryRevision = useSyncExternalStore(subscribeRegistry, registrySnapshot)
  const handled = useRef(-1)
  const request = useAnatomyStore((s) => s.cameraRequest)

  useEffect(() => {
    const c = controls.current
    if (!c || handled.current === request.nonce) return
    if (request.kind === 'performance') {
      goal.current = {
        position:
          request.action === 'wheel'
            ? new THREE.Vector3(2.6, 1.35, 1.25)
            : request.action === 'cartwheel'
              ? new THREE.Vector3(0.6, 1.35, 4.4)
              : new THREE.Vector3(2.1, 1.2, 3),
        target:
          request.action === 'wheel'
            ? new THREE.Vector3(0, 0.4, 0.2)
            : new THREE.Vector3(0, 0.95, 0),
      }
    } else if (request.kind === 'home') {
      const g = { position: HOME.position.clone(), target: HOME.target.clone() }
      // Presets are tuned for landscape; on portrait screens back off so the body isn't clipped sideways.
      const back = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 0.35 : 1
      g.position.sub(g.target).multiplyScalar(back).add(g.target)
      goal.current = g
    } else {
      const names =
        request.kind === 'system'
          ? structures.filter((s) => s.systems.includes(request.system)).map((s) => s.meshName)
          : request.kind === 'meshes'
            ? request.meshNames
            : [request.meshName]
      // Wait for every constituent layer before fitting a system, including shared surfaces.
      if (names.some((name) => !meshRegistry.has(name))) return
      const box = new THREE.Box3()
      for (const name of names) {
        const mesh = meshRegistry.get(name)!
        if ((mesh as THREE.SkinnedMesh).isSkinnedMesh)
          (mesh as THREE.SkinnedMesh).computeBoundingBox()
        box.expandByObject(mesh)
        if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) Reflect.set(mesh, 'boundingBox', null) // Bounds must be recomputed for the next pose.
      }
      const sphere = box.getBoundingSphere(new THREE.Sphere())
      const dist = Math.max(
        0.12,
        ((sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.5) /
          Math.min(1, camera.aspect),
      )
      // Guide targets face a fixed side. Otherwise keep roughly the current viewing angle,
      // biased toward the front so organs aren't viewed from behind.
      const dir =
        request.kind === 'meshes'
          ? VIEW_DIR[request.view].clone()
          : camera.position
              .clone()
              .sub(c.target)
              .normalize()
              .multiplyScalar(0.5)
              .add(FOCUS_DIR_BIAS.clone().normalize().multiplyScalar(0.5))
              .normalize()
      goal.current = {
        target: sphere.center.clone(),
        position: sphere.center.clone().addScaledVector(dir, dist),
      }
    }
    handled.current = request.nonce
    if (goal.current && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera.position.copy(goal.current.position)
      c.target.copy(goal.current.target)
      c.update()
      goal.current = null
    }
    invalidate()
  }, [request, camera, invalidate, registryRevision])

  useFrame((_, dt) => {
    const g = goal.current,
      c = controls.current
    if (!g || !c) return
    damp3(camera.position, g.position, 0.3, dt)
    damp3(c.target, g.target, 0.3, dt)
    c.update()
    if (camera.position.distanceTo(g.position) < 0.003 && c.target.distanceTo(g.target) < 0.003)
      goal.current = null
    invalidate()
  })

  return (
    <OrbitControls
      ref={controls as never}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={0.06}
      maxDistance={9}
      maxPolarAngle={Math.PI * 0.92}
      target={HOME.target.toArray()}
      onStart={() => {
        goal.current = null
      }} // user input always wins over an animation
    />
  )
}
