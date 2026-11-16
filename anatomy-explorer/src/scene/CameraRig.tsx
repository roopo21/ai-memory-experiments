import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { damp3 } from 'maath/easing'
import { HOME } from '../lib/framing'
import { useAnatomyStore } from '../store/useAnatomyStore'
import { meshRegistry, subscribeRegistry, registrySnapshot } from './registry'

const FOCUS_DIR_BIAS = new THREE.Vector3(0, 0.1, 1)

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
    if (request.kind === 'home') {
      const g = { position: HOME.position.clone(), target: HOME.target.clone() }
      // Presets are tuned for landscape; on portrait screens back off so the body isn't clipped sideways.
      const back = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 0.35 : 1
      g.position.sub(g.target).multiplyScalar(back).add(g.target)
      goal.current = g
    } else {
      const obj = meshRegistry.get(request.meshName)
      if (!obj) return
      const box = new THREE.Box3().setFromObject(obj)
      const sphere = box.getBoundingSphere(new THREE.Sphere())
      const dist = Math.max(
        0.12,
        (sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.5,
      )
      // Keep roughly the current viewing angle, but bias toward the front so organs aren't viewed from behind.
      const dir = camera.position
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
