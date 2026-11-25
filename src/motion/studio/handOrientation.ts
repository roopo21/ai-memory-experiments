import { Matrix4, Quaternion, Vector3 } from 'three'
export function basis(finger: Vector3, normal: Vector3) {
  const z = finger.normalize(),
    y = normal.addScaledVector(z, -normal.dot(z)).normalize()
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(y.clone().cross(z), y, z))
}
export const palmOrientation = (side: number, fingers: Vector3, normal: Vector3) =>
  basis(fingers, normal).multiply(
    basis(new Vector3(0.025 * side, -0.156, 0.093), new Vector3(0, 0, 1)).invert(),
  )
