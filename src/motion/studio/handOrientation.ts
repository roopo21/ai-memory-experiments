import { Matrix4, Quaternion, Vector3 } from 'three'
import { armFrame } from '../anatomy'

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
