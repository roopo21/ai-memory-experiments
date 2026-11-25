import {
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  GreaterDepth,
  SkinnedMesh,
  Vector2,
  Vector4,
  type Object3D,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { layerSources, skeletonUrl, structureByMesh } from '../../anatomy/catalogue'
import { meshesOf } from '../../guides/library/groups'
import { clipInfo, motionTargets, type ClipId, type Figure, type Side } from '../../studio/clips'
import { skinAnatomyMesh, type MovementRig } from '../movementRig'

import type { Project } from '../../studio/project'

export function selectSurfaces(
  id: ClipId,
  figure: Figure,
  side: Side,
  target?: Project['target'],
  base?: Project['base'],
) {
  const selected = new Map<string, 'primary' | 'secondary'>()
  const { kind, primary, secondary } = motionTargets(id, target, base)
  const partId = id === 'custom' && base ? base.id : id
  const activeSide = id === 'custom' && base ? base.side : side
  if (figure === 'anatomy' || figure === 'pair')
    for (const [role, groups] of [
      ['secondary', secondary],
      ['primary', primary],
    ] as const) {
      for (const name of meshesOf(kind, groups)) {
        const opposite = activeSide === 'left' ? 'right' : 'left'
        if (
          clipInfo(partId).unilateral &&
          structureByMesh.get(name)?.displayName.toLowerCase().includes(opposite)
        )
          continue
        selected.set(name, role)
      }
    }
  return {
    selected,
    kind,
    urls: layerSources
      .filter((l) => l.url === skeletonUrl || l.meshes.some((n) => selected.has(n)))
      .map((l) => l.url),
  }
}
// A screen-space stroke keeps thin nerve branches legible in a full-body recording.
function nerveHighlight(primary: boolean) {
  const pixel = new Vector2(),
    viewport = new Vector4()
  const material = new MeshBasicMaterial({
    color: primary ? '#1ddbdd' : '#9da9fa',
    transparent: true,
    opacity: primary ? 0.83 : 0.45,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
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
    const diameter = primary ? 2.7 : 1.6
    pixel.set(diameter / Math.max(1, viewport.z), diameter / Math.max(1, viewport.w))
  }
  return material
}
export function makeFigure(
  scenes: Object3D[],
  rig: MovementRig,
  figure: Figure,
  selection: ReturnType<typeof selectSurfaces>,
) {
  const root = new Group()
  const owned: { dispose: () => void }[] = []
  if (figure === 'human') {
    scenes[0].traverse((o) => {
      if (o instanceof SkinnedMesh) {
        const mesh = new SkinnedMesh(o.geometry, o.material)
        mesh.bind(rig.skeleton, new Matrix4())
        mesh.frustumCulled = false
        mesh.castShadow = true
        root.add(mesh)
      }
    })
  } else {
    const byRole = new Map<string, Mesh['geometry'][]>()
    for (const scene of scenes)
      scene.traverse((o) => {
        if (!(o instanceof Mesh)) return
        const s = structureByMesh.get(o.name),
          role = selection.selected.get(o.name) ?? (s?.systems.includes('skeletal') ? 'bone' : null)
        if (!role) return
        const geo = skinAnatomyMesh(o.clone(false), s, rig).geometry
        for (const attr of Object.keys(geo.attributes))
          if (!['position', 'normal', 'skinIndex', 'skinWeight'].includes(attr))
            geo.deleteAttribute(attr)
        if (!geo.hasAttribute('normal')) geo.computeVertexNormals()
        const list = byRole.get(role) ?? []
        list.push(geo)
        byRole.set(role, list)
      })
    for (const [role, geometries] of byRole) {
      const nerve = selection.kind === 'glide'
      const color =
        role === 'bone'
          ? '#e2d5be'
          : role === 'primary'
            ? nerve
              ? '#42dada'
              : '#ffbb38'
            : nerve
              ? '#a4adee'
              : '#cf6b47'
      const material = new MeshStandardMaterial({
        color,
        roughness: 0.68,
        emissive: role === 'bone' ? '#000000' : color,
        emissiveIntensity: 0.17,
      })
      owned.push(material)
      // A deep target stays readable through an overlying bone. The second pass draws
      // only fragments behind an opaque surface and reuses the exact same skinned mesh.
      const hidden =
        role === 'bone'
          ? null
          : new MeshBasicMaterial({
              color,
              transparent: true,
              opacity: role === 'primary' ? 0.6 : 0.26,
              depthFunc: GreaterDepth,
              depthWrite: false,
            })
      if (hidden) owned.push(hidden)
      const stroke = nerve && role !== 'bone' ? nerveHighlight(role === 'primary') : null
      if (stroke) owned.push(stroke)
      const merged = mergeGeometries(geometries)
      if (merged) for (const g of geometries) g.dispose()
      for (const geometry of merged ? [merged] : geometries) {
        const mesh = new SkinnedMesh(geometry, material)
        mesh.bind(rig.skeleton, new Matrix4())
        mesh.frustumCulled = false
        mesh.castShadow = true
        root.add(mesh)
        if (stroke) {
          const outline = new SkinnedMesh(geometry, stroke)
          outline.bind(rig.skeleton, new Matrix4())
          outline.frustumCulled = false
          outline.renderOrder = role === 'primary' ? 5 : 4
          root.add(outline)
        }
        if (hidden) {
          const deep = new SkinnedMesh(geometry, hidden)
          deep.bind(rig.skeleton, new Matrix4())
          deep.frustumCulled = false
          deep.renderOrder = role === 'primary' ? 3 : 2
          root.add(deep)
        }
        owned.push(geometry)
      }
    }
  }
  if (!root.children.length) throw Error('No compatible rig surfaces were found.')
  return { root, dispose: () => owned.forEach((v) => v.dispose()) }
}
