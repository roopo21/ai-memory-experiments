import { OrthographicCamera, Vector2, type Camera, type Scene, type WebGLRenderer } from 'three'

const size = new Vector2()
/** Both panels use the same sampled joints, orbit and lighting. Only the visible skin changes. */
export function renderStage(gl: WebGLRenderer, scene: Scene, camera: Camera, pair: boolean) {
  if (!pair || !(camera instanceof OrthographicCamera)) {
    gl.render(scene, camera)
    return
  }
  const { x: w, y: h } = gl.getSize(size),
    left = Math.floor(w / 2),
    mask = camera.layers.mask
  const originalLeft = camera.left,
    originalRight = camera.right
  gl.setScissorTest(true)
  try {
    for (const [layer, start, width] of [
      [1, 0, left],
      [2, left, w - left],
    ]) {
      camera.left = (originalLeft * width) / w
      camera.right = (originalRight * width) / w
      camera.updateProjectionMatrix()
      camera.layers.set(0)
      camera.layers.enable(layer)
      gl.setViewport(start, 0, width, h)
      gl.setScissor(start, 0, width, h)
      gl.render(scene, camera)
    }
  } finally {
    camera.left = originalLeft
    camera.right = originalRight
    camera.updateProjectionMatrix()
    camera.layers.mask = mask
    gl.setScissorTest(false)
    gl.setViewport(0, 0, w, h)
  }
}
