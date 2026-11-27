import {
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  GreaterDepth,
  SkinnedMesh,
  type Object3D,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { layerSources, structureByMesh } from '../../anatomy/catalogue'
import { glideViews, inGlideRegion } from '../../studio/glideViews'
import { meshesOf } from '../../guides/library/groups'
import { clipInfo, motionTargets, type ClipId, type Figure, type Side } from '../../studio/clips'
import { skinAnatomyMesh, type MovementRig } from '../movementRig'

import { nerveStroke } from '../../viewer/nerveStroke'
import { GUIDE_PALETTE, MUSCLE, GLIDE_MUSCLE_OPACITY } from '../../viewer/appearance'
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
  for (const [role, groups] of [
    ['secondary', secondary],
    ['primary', primary],
  ] as const) {
    for (const group of groups)
      for (const name of meshesOf(kind, [group])) {
        // The guide's sciatic group includes neighbouring sacral plexus branches.
        // Render the named trunk as the sciatic target.
        if (
          group === 'sciatic' &&
          !structureByMesh.get(name)?.displayName.toLowerCase().includes('sciatic nerve')
        )
          continue
        const opposite = activeSide === 'left' ? 'right' : 'left'
        if (
          clipInfo(partId).unilateral &&
          structureByMesh.get(name)?.displayName.toLowerCase().includes(opposite)
        )
          continue
        selected.set(name, role)
      }
  }
  const region = kind === 'glide' ? glideViews.get(partId)?.region : undefined
  const regionSide = clipInfo(partId).unilateral ? activeSide : undefined
  function roleFor(name: string) {
    const s = structureByMesh.get(name)
    if (!s) return null
    const targetRole = selected.get(name)
    const muscle = s.systems.includes('muscular')
    const local = muscle && region && inGlideRegion(s, region, regionSide)
    if (figure === 'muscles')
      return muscle
        ? (targetRole ?? (local || (!region && !selected.size) ? 'muscle' : null))
        : null
    if (figure === 'bones') {
      if (s.systems.includes('skeletal')) return 'bone'
      return s.systems.includes('nervous') ? (targetRole ?? 'nerve') : null
    }
    return (
      targetRole ??
      (muscle
        ? local
          ? 'faded'
          : 'muscle'
        : s.systems.includes('skeletal') && figure !== 'human'
          ? 'bone'
          : null)
    )
  }
  return {
    roleFor,
    selected,
    kind,
    urls: layerSources
      .filter((l) => l.meshes.some((name) => roleFor(name) !== null))
      .map((l) => l.url),
  }
}
// A screen-space stroke keeps thin nerve branches legible in a full-body recording.
function nerveHighlight(primary: boolean) {
  const material = new MeshBasicMaterial({
    color: primary ? GUIDE_PALETTE.glide.primary : GUIDE_PALETTE.glide.secondary,
    transparent: true,
    opacity: primary ? 0.83 : 0.45,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  nerveStroke(material, () => (primary ? 2.7 : 1.6))
  return material
}
export function makeFigure(
  scenes: Object3D[],
  rig: MovementRig,
  selection: ReturnType<typeof selectSurfaces>,
) {
  const root = new Group()
  const owned: { dispose: () => void }[] = []
  const byRole = new Map<string, Mesh['geometry'][]>()
  for (const scene of scenes)
    scene.traverse((o) => {
      if (!(o instanceof Mesh)) return
      const s = structureByMesh.get(o.name),
        role = selection.roleFor(o.name)
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
    const focus = role === 'primary' || role === 'secondary'
    const color = focus
      ? GUIDE_PALETTE[selection.kind][role]
      : role === 'nerve'
        ? '#709498'
        : role === 'muscle' || role === 'faded'
          ? MUSCLE
          : '#e2d5be'
    const opacity = role === 'faded' ? GLIDE_MUSCLE_OPACITY : 1
    const material = new MeshStandardMaterial({
      color,
      roughness: 0.68,
      emissive: focus ? color : '#000000',
      emissiveIntensity: 0.17,
      opacity,
      transparent: opacity < 1,
      depthWrite: opacity === 1,
    })
    owned.push(material)
    // A deep target stays readable through an overlying bone. The second pass draws
    // only fragments behind an opaque surface and reuses the exact same skinned mesh.
    const hidden = !focus
      ? null
      : new MeshBasicMaterial({
          color,
          transparent: true,
          opacity: role === 'primary' ? 0.6 : 0.26,
          depthFunc: GreaterDepth,
          depthWrite: false,
        })
    if (hidden) owned.push(hidden)
    const stroke = nerve && focus ? nerveHighlight(role === 'primary') : null
    if (stroke) owned.push(stroke)
    const merged = mergeGeometries(geometries)
    if (merged) for (const g of geometries) g.dispose()
    for (const geometry of merged ? [merged] : geometries) {
      const mesh = new SkinnedMesh(geometry, material)
      mesh.bind(rig.skeleton, new Matrix4())
      mesh.frustumCulled = false
      mesh.castShadow = opacity === 1
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
  return { root, dispose: () => owned.forEach((v) => v.dispose()) }
}

// The human outline provides pose context while the same rigged anatomy remains visible inside.
export function addPerformer(root: Group, scene: Object3D, rig: MovementRig) {
  const shell = new MeshStandardMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    roughness: 0.85,
  })
  scene.traverse((o) => {
    if (!(o instanceof SkinnedMesh)) return
    const mesh = new SkinnedMesh(o.geometry, shell)
    mesh.bind(rig.skeleton, new Matrix4())
    mesh.frustumCulled = false
    mesh.renderOrder = 1
    root.add(mesh)
  })
  return () => shell.dispose()
}
