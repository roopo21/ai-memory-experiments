import { Vector2, Vector4, type Material } from 'three'

/** Expand a nerve silhouette in screen pixels so thin branches survive full-body framing. */
export function nerveStroke(material: Material, width: () => number) {
  const pixel = new Vector2()
  const viewport = new Vector4()
  material.onBeforeCompile = (shader) => {
    shader.uniforms.strokePixel = { value: pixel }
    shader.vertexShader =
      'uniform vec2 strokePixel;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
    vec2 contour = transformedNormal.xy;
    gl_Position.xy += contour / max(length(contour), 0.3) * strokePixel * gl_Position.w;`,
      )
  }
  material.onBeforeRender = (renderer) => {
    renderer.getViewport(viewport)
    const diameter = width()
    pixel.set(diameter / Math.max(1, viewport.z), diameter / Math.max(1, viewport.w))
  }
}
