import { Matrix4, Quaternion, Vector3 } from 'three'
import { armFrame } from '../anatomy'
import { limbFrames } from '../limbFrames'

export function basis(finger: Vector3, normal: Vector3) {
  const z = finger.normalize(),
    y = normal.addScaledVector(z, -normal.dot(z)).normalize()
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(y.clone().cross(z), y, z))
}
/** World hand orientation whose fingers point along `fingers` and whose palm faces `normal`. */
export const palmOrientation = (side: number, fingers: Vector3, normal: Vector3) => {
  const f = armFrame(side === 1 ? 1 : -1)
  return basis(fingers, normal).multiply(basis(f.handLong.clone(), f.palmar.clone()).invert())
}
/**
 * World orientation of a hand lying flat on a surface: fingers along `fingers`, and the plane
 * through the heel of the hand and the knuckles facing `normal`. The bony axis of the hand then
 * dips toward the fingers, as on a real flat hand, which spares the wrist about 8 degrees of
 * extension when the forearm stands over it.
 */
export const flatPalmOrientation = (side: number, fingers: Vector3, normal: Vector3) => {
  const f = side === 1 ? limbFrames.left : limbFrames.right
  return basis(fingers, normal).multiply(
    basis(new Vector3(...f.palmSurfaceLong), new Vector3(...f.palmSurface)).invert(),
  )
}
