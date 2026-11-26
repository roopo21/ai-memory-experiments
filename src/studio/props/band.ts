import {
  type Bone,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import { palmPad } from '../../motion/studio/anchors'
import type { MovementRig } from '../../motion/movementRig'

const steps = 20
const wrapSteps = 16
const count = 2 * steps + wrapSteps + 1
// Walk around the cross-section so each edge has a face even when viewed side-on.
const offsets = [-1, -0.85, 0.85, 1, 1, 0.85, -0.85, -1]
const trim = new Color('#bec4c8')
const fabric = new Color('#67757e')

// A flat elastic strip with a narrow woven selvedge on each side.
export function makeBand(
  rig: MovementRig,
  foot: Bone,
  side: number,
  heel: boolean,
  oneHand: boolean,
) {
  const geometry = new BufferGeometry()
  const positions = new Float32BufferAttribute(new Float32Array(count * 8 * 3), 3).setUsage(
    DynamicDrawUsage,
  )
  geometry.setAttribute('position', positions)
  const colors: number[] = [],
    indices: number[] = []
  for (let i = 0; i < count; i++) {
    for (const offset of offsets)
      (Math.abs(offset) === 1 ? trim : fabric).toArray(colors, colors.length)
    if (i)
      for (let j = 0; j < 8; j++) {
        const k = (i - 1) * 8 + j,
          next = (i - 1) * 8 + ((j + 1) % 8)
        indices.push(k, next, k + 8, k + 8, next, next + 8)
      }
  }
  const end = (count - 1) * 8
  indices.push(0, 7, 4, 0, 4, 3, end, end + 3, end + 4, end, end + 4, end + 7)
  geometry.setIndex(indices)
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
    side: DoubleSide,
  })
  const root = new Mesh(geometry, material)
  root.frustumCulled = false
  root.castShadow = true
  const centers = Array.from({ length: count }, () => new Vector3())
  const across = new Vector3(),
    tangent = new Vector3(),
    edge = new Vector3()
  const direction = new Vector3(),
    shin = new Vector3(),
    ankle = new Vector3(),
    nearest = new Vector3(),
    away = new Vector3()
  const normal = new Vector3()
  function update() {
    // The quad stretch pulls toward the heel, so its loop bears against the instep.
    for (let i = 0; i <= wrapSteps; i++) {
      const angle = (Math.PI * i) / wrapSteps
      const p = centers[steps + i]
      if (heel) p.set(side * 0.006 + 0.044 * Math.cos(angle), 0.005, 0.073 * Math.sin(angle))
      else p.set(side * 0.022 + 0.061 * Math.cos(angle), -0.042 - 0.031 * Math.sin(angle), 0.106)
      foot.localToWorld(p)
    }
    foot.getWorldPosition(ankle)
    foot.parent!.getWorldPosition(shin)
    direction.subVectors(shin, ankle)
    const shinLengthSq = direction.lengthSq()
    let span = 0
    for (const k of [1, -1]) {
      const gripSide = oneHand ? -side : k
      const palm = palmPad(gripSide)
      if (oneHand) palm.z += k * 0.008
      rig.bones[gripSide === 1 ? 8 : 11].localToWorld(palm)
      const start = k === 1 ? steps : steps + wrapSteps
      const anchor = centers[start]
      const length = anchor.distanceTo(palm)
      span += length
      for (let j = 1; j <= steps; j++) {
        const t = j / steps,
          p = centers[start - k * j]
        p.lerpVectors(anchor, palm, t)
        // Less separation leaves a slight bow. Long spans pull straight.
        p.y -= Math.max(0, 0.67 - length) * 0.12 * 4 * t * (1 - t)
        if (j === steps) continue
        const along = Math.max(
          0,
          Math.min(1, away.subVectors(p, ankle).dot(direction) / shinLengthSq),
        )
        nearest.copy(ankle).addScaledVector(direction, along)
        away.subVectors(p, nearest)
        const clearance = 0.04 + 0.028 * Math.sin(along * Math.PI)
        if (away.lengthSq() < clearance * clearance) p.copy(nearest).add(away.setLength(clearance))
      }
    }
    across.set(0, heel ? 1 : 0, heel ? 0 : 1).transformDirection(foot.matrixWorld)
    const halfWidth = Math.min(0.015, Math.max(0.01, 0.012 / Math.sqrt(span / 1.3)))
    for (let i = 0; i < count; i++) {
      tangent
        .subVectors(centers[Math.min(count - 1, i + 1)], centers[Math.max(0, i - 1)])
        .normalize()
      edge.copy(across).addScaledVector(tangent, -across.dot(tangent)).normalize()
      normal.crossVectors(edge, tangent)
      for (let j = 0; j < 8; j++) {
        const p = centers[i],
          d = offsets[j] * halfWidth,
          h = j < 4 ? 0.0011 : -0.0011
        positions.setXYZ(
          8 * i + j,
          p.x + edge.x * d + normal.x * h,
          p.y + edge.y * d + normal.y * h,
          p.z + edge.z * d + normal.z * h,
        )
      }
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
  }
  return {
    root,
    update,
    dispose: () => {
      geometry.dispose()
      material.dispose()
    },
  }
}
