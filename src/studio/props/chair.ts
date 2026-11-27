import { BufferGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { scores, type AuthoredId } from '../choreography'
import type { Side } from '../clips'
import { createMovementRig } from '../../motion/movementRig'
import { sampleGuide } from '../../motion/studio/guides/sampleGuide'
import { postures } from '../../motion/studio/guides/postures'
import { fixturePoint } from '../../motion/studio/guides/contacts'

/**
 * How far the seat must stand above its rest height. A lowered, extended leg lifts the pelvis
 * during grounding and would leave the performer perched on the front of the seat, so the chair
 * is sized once per clip from the highest the pelvis ever sits.
 */
export function chairLift(id: AuthoredId, side: Side) {
  const score = scores[id],
    probe = createMovementRig()
  let lowestPelvis = Infinity
  for (const frame of score.frames) {
    sampleGuide(probe, id, frame.time, side)
    lowestPelvis = Math.min(lowestPelvis, probe.root.position.y)
  }
  probe.skeleton.dispose()
  return Math.max(0, lowestPelvis - postures[score.posture].y)
}
/** Where a guide's chair is and how tall: the seat top (performer scale) and its centre. */
export function chairSeat(id: AuthoredId, side: Side) {
  const lift = chairLift(id, side)
  return { top: 0.372 + lift, z: -0.19 - Math.min(lift, 0.19), width: 0.43, depth: 0.36 }
}
export function makeGuideChair(id: AuthoredId, side: Side, human: boolean) {
  const score = scores[id]
  const sign = side === 'right' && !score.both ? -1 : 1
  if (score.posture !== 'chair' && score.posture !== 'figureFour') {
    const grip = fixturePoint(id, 'table', -sign)
    const chair = makeChair(0.41, 0.33, grip.y - 0.4)
    chair.root.position.set(grip.x - sign * 0.06, 0, grip.z + 0.18)
    return chair
  }

  const lift = chairLift(id, side)
  const z = -0.19 - Math.min(lift, 0.19)
  const grip = score.setup.ga === 'seat' ? fixturePoint(id, 'seat', sign) : undefined
  if (grip) grip.z -= z
  const chair = makeChair(0.43, 0.36, (human ? 0.372 : 0.407) + lift, 0, grip)
  chair.root.position.z = z
  return chair
}

export function makeChair(
  width: number,
  depth: number,
  height: number,
  pelvicPad = 0,
  grip?: Vector3,
) {
  const root = new Group()
  const frame = new MeshStandardMaterial({ color: '#555c63', metalness: 0.56, roughness: 0.38 })
  const upholstery = new MeshStandardMaterial({ color: '#30353b', roughness: 0.86 })
  const rubber = new MeshStandardMaterial({ color: '#191d21', roughness: 0.96 })
  const geometries: BufferGeometry[] = []
  function part(geometry: BufferGeometry, material: MeshStandardMaterial) {
    geometries.push(geometry)
    const mesh = new Mesh(geometry, material)
    mesh.castShadow = mesh.receiveShadow = true
    root.add(mesh)
    return mesh
  }
  function cushion(w: number, h: number, d: number, radius: number) {
    return part(new RoundedBoxGeometry(w, h, d, 3, radius), upholstery)
  }
  const up = new Vector3(0, 1, 0)
  function tube(a: Vector3, b: Vector3, radius: number, material = frame) {
    const direction = b.clone().sub(a)
    const mesh = part(new CylinderGeometry(radius, radius, direction.length(), 16), material)
    mesh.position.copy(a).lerp(b, 0.5)
    mesh.quaternion.setFromUnitVectors(up, direction.normalize())
    return mesh
  }
  const rear = -depth / 2
  cushion(width, 0.042, depth, 0.019).position.y = height - 0.021
  if (pelvicPad)
    cushion(0.12, pelvicPad, 0.066, 0.012).position.set(0, height + pelvicPad / 2, -0.05)
  const back = cushion(width - 0.016, 0.16, 0.037, 0.018)
  // The sides wrap forward, leaving space behind the spine.
  const positions = back.geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++)
    positions.setZ(i, positions.getZ(i) + 0.024 * ((2 * positions.getX(i)) / width) ** 2)
  back.geometry.computeVertexNormals()
  back.position.set(0, height + 0.32, rear - 0.018)
  back.rotation.x = -0.09
  const v = (x: number, y: number, z: number) => new Vector3(x, y, z)
  if (grip) {
    const y = grip.y
    for (const dz of [-0.06, 0.06])
      tube(v(grip.x * 0.94, height - 0.018, grip.z + dz), v(grip.x, y, grip.z + dz), 0.009)
    tube(v(grip.x, y, grip.z - 0.06), v(grip.x, y, grip.z + 0.06), 0.009).name =
      grip.x > 0 ? 'left-grip-shaft' : 'right-grip-shaft'
  }
  for (const side of [-1, 1]) {
    const x = side * (width / 2 - 0.032)
    const front = v(x, height - 0.048, depth / 2 - 0.045)
    const joint = v(x, height - 0.048, rear + 0.035)
    tube(front, joint, 0.012)
    tube(joint, v(x, height + 0.34, rear - 0.013), 0.0115)
    for (const mount of [front, joint]) {
      const foot = v(x + side * 0.012, 0, mount.z + Math.sign(mount.z) * 0.032)
      const cap = foot.clone().lerp(mount, 0.043)
      tube(cap, mount, 0.013)
      tube(foot, cap, 0.014, rubber)
    }
  }
  return {
    root,
    dispose() {
      geometries.forEach((g) => g.dispose())
      frame.dispose()
      upholstery.dispose()
      rubber.dispose()
    },
  }
}
