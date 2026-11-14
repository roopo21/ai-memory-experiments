import { Vector3 } from 'three'
import { systemById, type SystemId } from '../data/anatomy'

export const HOME = { position: new Vector3(0, 1.1, 3.7), target: new Vector3(0, 0.95, 0) }

/**
 * Framing for one or more systems. Targets/positions are averaged and the viewing distance is the
 * largest of the individual distances, so Skeletal + Nervous frames both without clipping either.
 */
export function framingForSystems(ids: SystemId[]): { position: Vector3; target: Vector3 } {
  const cams = ids.map((id) => systemById.get(id)!.camera)
  if (!cams.length) return { position: HOME.position.clone(), target: HOME.target.clone() }
  const target = new Vector3()
  const dir = new Vector3()
  let dist = 0
  for (const c of cams) {
    const t = new Vector3(...c.target)
    const off = new Vector3(...c.position).sub(t)
    target.add(t)
    dist = Math.max(dist, off.length())
    dir.add(off.normalize())
  }
  target.divideScalar(cams.length)
  dir.normalize()
  // Combined systems usually span more of the body, so back off a little.
  return { target, position: target.clone().addScaledVector(dir, dist * (1 + 0.12 * (cams.length - 1))) }
}
