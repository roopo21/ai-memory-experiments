import { useContext, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { BodyPose } from './LivingBody'

/** Small, soft contact marks keep the animated palms and soles visually grounded. */
export default function MovementShadows() {
  const rig = useContext(BodyPose)
  const group = useRef<Group>(null)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const context = canvas.getContext('2d')!
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(0,0,0,.65)')
    gradient.addColorStop(0.45, 'rgba(0,0,0,.35)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 64, 64)
    return new CanvasTexture(canvas)
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  const point = useMemo(() => new Vector3(), [])
  useFrame(() => {
    if (!rig || !group.current) return
    const parent = group.current.parent!
    for (let i = 0; i < 4; i++) {
      const bone = rig.bones[[14, 17, 8, 11][i]]
      bone.getWorldPosition(point)
      parent.worldToLocal(point)
      const mesh = group.current.children[i] as Mesh
      const foot = i < 2
      const height = Math.max(0, point.y - (foot ? 0.065 : 0.035))
      mesh.position.set(point.x, -0.001, point.z + (foot ? 0.05 : 0))
      const spread = 1 + height * 1.5
      mesh.scale.set((foot ? 0.22 : 0.15) * spread, (foot ? 0.3 : 0.15) * spread, 1)
      ;(mesh.material as MeshBasicMaterial).opacity = Math.max(0, 0.55 - height * 2.2)
      mesh.visible = height < 0.25
    }
  })
  return (
    <group ref={group}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
