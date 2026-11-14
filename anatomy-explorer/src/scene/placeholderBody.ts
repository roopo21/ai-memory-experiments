/**
 * Procedural placeholder body (capsules / spheres / tubes) with every mesh named to match
 * systems.json. Used by scripts/generate-placeholder-models.ts to write the placeholder GLBs,
 * and as a runtime fallback if a GLB fails to load.
 *
 * Conventions: Y up, +Z is the front of the body, 1 unit = 1 metre. The patient's left is +X.
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Sex } from '../data/anatomy'

type V3 = [number, number, number]

export function buildPlaceholderBody(sex: Sex): THREE.Group {
  const female = sex === 'female'
  const root = new THREE.Group()
  root.name = `${sex}_body`
  const s = female ? 0.93 : 1 // overall scale
  const arm = female ? 0.9 : 1 // shoulder/arm offset
  const hip = female ? 1.2 : 1 // pelvis width

  const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6 })
  const mesh = (name: string, geo: THREE.BufferGeometry, pos: V3, scale: V3 = [1, 1, 1], rot: V3 = [0, 0, 0]) => {
    const m = new THREE.Mesh(geo, mat)
    m.name = name
    m.position.set(...pos)
    m.scale.set(...scale)
    m.rotation.set(...rot)
    root.add(m)
    return m
  }
  const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 8, 16)
  const sphere = (r: number) => new THREE.SphereGeometry(r, 24, 16)
  const cyl = (r: number, h: number) => new THREE.CylinderGeometry(r, r, h, 12)
  const tube = (pts: V3[], r: number) =>
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 32, r, 8)
  const pair = (base: string, make: () => THREE.BufferGeometry, x: number, y: number, z: number, sc: V3 = [1, 1, 1], rot: V3 = [0, 0, 0]) => {
    mesh(`${base}_L`, make(), [x, y, z], sc, rot)
    mesh(`${base}_R`, make(), [-x, y, z], sc, [rot[0], -rot[1], -rot[2]])
  }

  // ---- Integumentary
  mesh('Skin_Head', sphere(0.115), [0, 1.68, 0], [0.9, 1.15, 1])
  mesh('Skin_Neck', cyl(0.05, 0.14), [0, 1.53, 0])
  mesh('Skin_Torso', capsule(0.18, 0.42), [0, 1.2, 0], [1 * (female ? 0.92 : 1), 1, 0.62])
  pair('Skin_Arm', () => capsule(0.05, 0.55), 0.27 * arm, 1.22, 0)
  pair('Skin_Leg', () => capsule(0.075, 0.72), 0.1 * (female ? 1.1 : 1), 0.45, 0)

  // ---- Skeletal
  // Open-fronted cranial shell so the brain stays visible from the front in the placeholder.
  mesh('Skull', new THREE.SphereGeometry(0.108, 28, 18, Math.PI * 0.75, Math.PI * 1.5, 0, Math.PI * 0.8), [0, 1.68, 0], [0.9, 1.1, 1])
  {
    // Vertebrae as stacked discs with gaps, so the spinal cord is visible between them.
    const discs: THREE.BufferGeometry[] = []
    for (let i = 0; i < 24; i++) discs.push(cyl(0.026, 0.018).translate(0, 0.95 + 0.026 * i + 0.01, 0))
    mesh('Spine', mergeGeometries(discs)!, [0, 0, -0.075])
  }
  {
    const rings: THREE.BufferGeometry[] = []
    for (let i = 0; i < 6; i++) {
      const g = new THREE.TorusGeometry(0.15 - Math.abs(i - 2.5) * 0.006 * (i > 2 ? 3 : 1), 0.007, 6, 28)
      g.rotateX(Math.PI / 2)
      g.scale(1, 1, 0.65)
      g.translate(0, 1.5 - i * 0.045, 0)
      rings.push(g)
    }
    mesh('Ribcage', mergeGeometries(rings)!, [0, 0, 0], [female ? 0.92 : 1, 1, 1])
  }
  {
    const g = new THREE.TorusGeometry(0.15, 0.028, 8, 28)
    g.rotateX(Math.PI / 2)
    mesh('Pelvis', g, [0, 0.92, 0], [hip, 1, 0.6])
  }
  pair('Humerus', () => capsule(0.022, 0.26), 0.27 * arm, 1.36, 0)
  pair('Femur', () => capsule(0.028, 0.38), 0.1 * (female ? 1.1 : 1), 0.62, 0)
  pair('Tibia', () => capsule(0.024, 0.38), 0.1 * (female ? 1.1 : 1), 0.2, 0)
  mesh('Bone_Marrow', sphere(0.03), [0.17 * hip, 0.94, 0.04], [1, 1.4, 0.8])

  // ---- Muscular
  pair('Pectoralis', () => sphere(0.07), 0.085, 1.42, 0.085, [1.1, 0.8, 0.4])
  pair('Biceps', () => capsule(0.033, 0.16), 0.27 * arm, 1.3, 0.02)
  pair('Quadriceps', () => capsule(0.05, 0.3), 0.1 * (female ? 1.1 : 1), 0.62, 0.018)
  mesh('Diaphragm', sphere(0.15), [0, 1.2, 0], [1, 0.1, 0.62])

  // ---- Nervous
  mesh('Brain', sphere(0.085), [0, 1.69, 0], [0.9, 0.95, 1.05])
  mesh('Spinal_Cord', cyl(0.01, 0.72), [0, 1.3, -0.075])
  pair('Sciatic_Nerve', () => cyl(0.006, 0.58), 0.12 * (female ? 1.1 : 1), 0.6, -0.03)

  // ---- Endocrine
  mesh('Pituitary', sphere(0.01), [0, 1.645, 0.025])
  mesh('Thyroid', sphere(0.022), [0, 1.5, 0.038], [1.4, 0.7, 0.5])
  pair('Adrenal', () => sphere(0.02), 0.065, 1.1, -0.06, [1, 0.5, 0.8])
  mesh('Pancreas', capsule(0.014, 0.12), [0.005, 1.11, 0.0], [1, 1, 0.8], [0, 0, Math.PI / 2])

  // ---- Cardiovascular
  mesh('Heart', sphere(0.042), [0.035, 1.3, 0.035], [1, 1.15, 0.9])
  mesh('Aorta', tube([[0.03, 1.33, 0.03], [0.025, 1.4, 0.02], [0.05, 1.38, -0.01], [0.04, 1.3, -0.04], [0.02, 1.0, -0.045]], 0.012), [0, 0, 0])
  mesh('Vena_Cava', tube([[-0.025, 1.33, 0.02], [-0.03, 1.1, -0.02], [-0.03, 0.95, -0.035]], 0.013), [0, 0, 0])

  // ---- Lymphatic / immune
  mesh('Thymus', sphere(0.025), [0, 1.42, 0.06], [1.3, 1.1, 0.6])
  mesh('Spleen', sphere(0.03), [0.12, 1.17, -0.05], [0.8, 1.5, 0.7])
  pair('Lymph_Node_Axilla', () => sphere(0.014), 0.2 * arm, 1.42, 0)
  pair('Lymph_Node_Inguinal', () => sphere(0.014), 0.08, 0.85, 0.07)

  // ---- Respiratory
  mesh('Trachea', cyl(0.012, 0.2), [0, 1.42, 0.015])
  pair('Lung', () => sphere(0.05), 0.095, 1.34, 0, [1, 2, 1.1])

  // ---- Digestive
  mesh('Esophagus', cyl(0.009, 0.32), [0, 1.34, -0.005])
  mesh('Stomach', sphere(0.05), [0.07, 1.14, 0.04], [1.1, 1, 0.8])
  mesh('Liver', sphere(0.06), [-0.075, 1.17, 0.035], [1.5, 0.8, 1])
  mesh('Gallbladder', sphere(0.015), [-0.06, 1.12, 0.075], [1, 1.5, 1])
  mesh('Small_Intestine', new THREE.TorusKnotGeometry(0.045, 0.014, 80, 8, 2, 3), [0, 1.0, 0.02], [1, 1, 0.6])
  mesh('Large_Intestine', new THREE.TorusGeometry(0.1, 0.017, 8, 28), [0, 1.0, 0.03], [1, 1, 0.6])

  // ---- Urinary
  pair('Kidney', () => sphere(0.025), 0.065, 1.12, -0.06, [0.8, 1.6, 0.8])
  pair('Ureter', () => cyl(0.004, 0.2), 0.045, 1.0, -0.045, [1, 1, 1], [0, 0, 0.12])
  mesh('Bladder', sphere(0.032), [0, 0.87, 0.055])

  // ---- Reproductive (sex-specific)
  if (female) {
    mesh('Uterus', sphere(0.034), [0, 0.92, 0.012], [0.9, 1.2, 0.8])
    pair('Ovary', () => sphere(0.015), 0.075, 0.93, 0.01, [1, 0.8, 0.7])
  } else {
    pair('Testis', () => sphere(0.02), 0.03, 0.78, 0.05, [0.8, 1.2, 0.8])
    mesh('Prostate', sphere(0.02), [0, 0.83, 0.02])
  }

  root.scale.setScalar(s)
  root.updateMatrixWorld(true)
  return root
}
