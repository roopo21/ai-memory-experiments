import { structures, type Structure } from '../../anatomy/catalogue'
import type { Group, GroupDef, GuideKind } from './types'

/**
 * Stretch targets. Each group is a set of catalogue muscles that one stretch lengthens together.
 * A muscle may sit in more than one group (rectus femoris crosses the hip and the knee).
 */
const MUSCLE_GROUPS: GroupDef[] = [
  // Neck
  {
    id: 'upper-trapezius',
    name: 'Upper trapezius',
    area: 'Neck',
    view: 'back',
    match: /descending part of (left|right) trapezius/,
  },
  {
    id: 'levator-scapulae',
    name: 'Levator scapulae',
    area: 'Neck',
    view: 'back',
    match: /levator scapulae/,
  },
  {
    id: 'scm',
    name: 'Sternocleidomastoid',
    area: 'Neck',
    view: 'front',
    match: /sternocleidomastoid/,
  },
  { id: 'scalenes', name: 'Scalenes', area: 'Neck', view: 'front', match: /scalenus/ },
  {
    id: 'front-neck',
    name: 'Front of throat (hyoid muscles, platysma)',
    area: 'Neck',
    view: 'front',
    match:
      /digastric|geniohyoid|mylohyoid|stylohyoid|omohyoid|sternohyoid|sternothyroid|thyrohyoid|platysma|intermediate tendon/,
  },
  {
    id: 'deep-neck-flexors',
    name: 'Deep neck flexors',
    area: 'Neck',
    view: 'front',
    match: /longus colli|longus capitis|rectus capitis anterior|rectus capitis lateralis/,
  },
  {
    id: 'neck-extensors',
    name: 'Back of neck (splenius, semispinalis)',
    area: 'Neck',
    view: 'back',
    match:
      /splenius|semispinalis capitis|semispinalis cervicis|longissimus capitis|longissimus cervicis|iliocostalis cervicis|spinalis cervicis|cervical rotator|interspinales cervicis|cervical intertransversarii/,
  },
  {
    id: 'suboccipitals',
    name: 'Suboccipitals',
    area: 'Neck',
    view: 'back',
    match: /rectus capitis posterior|obliquus capitis/,
  },
  // Jaw
  {
    id: 'jaw',
    name: 'Jaw (masseter, temporalis, pterygoids)',
    area: 'Jaw',
    view: 'side',
    match: /masseter|temporalis|pterygoid/,
  },
  // Shoulders
  {
    id: 'deltoid-anterior',
    name: 'Front deltoid',
    area: 'Shoulders',
    view: 'front',
    match: /clavicular part of (left|right) deltoid/,
  },
  {
    id: 'deltoid-middle',
    name: 'Middle deltoid',
    area: 'Shoulders',
    view: 'side',
    match: /acromial part of (left|right) deltoid/,
  },
  {
    id: 'deltoid-posterior',
    name: 'Rear deltoid',
    area: 'Shoulders',
    view: 'back',
    match: /spinal part of (left|right) deltoid/,
  },
  {
    id: 'external-rotators',
    name: 'Rotator cuff: infraspinatus, teres minor',
    area: 'Shoulders',
    view: 'back',
    match: /infraspinatus|teres minor/,
  },
  {
    id: 'subscapularis',
    name: 'Rotator cuff: subscapularis',
    area: 'Shoulders',
    view: 'front',
    match: /subscapularis/,
  },
  {
    id: 'supraspinatus',
    name: 'Rotator cuff: supraspinatus',
    area: 'Shoulders',
    view: 'back',
    match: /supraspinatus/,
  },
  // Chest and ribs
  {
    id: 'pec-major',
    name: 'Pectoralis major',
    area: 'Chest and ribs',
    view: 'front',
    match: /pectoralis major/,
  },
  {
    id: 'pec-minor',
    name: 'Pectoralis minor',
    area: 'Chest and ribs',
    view: 'front',
    match: /pectoralis minor|subclavius/,
  },
  {
    id: 'serratus-anterior',
    name: 'Serratus anterior',
    area: 'Chest and ribs',
    view: 'side',
    match: /serratus anterior/,
  },
  {
    id: 'intercostals',
    name: 'Rib cage (intercostals)',
    area: 'Chest and ribs',
    view: 'front',
    match: /intercostal|levatores costarum|transversus thoracis|serratus posterior/,
  },
  // Upper back
  {
    id: 'lats',
    name: 'Lats and teres major',
    area: 'Upper back',
    view: 'back',
    match: /latissimus dorsi|teres major/,
  },
  {
    id: 'rhomboids-mid-traps',
    name: 'Rhomboids and mid/lower trapezius',
    area: 'Upper back',
    view: 'back',
    match: /rhomboid|(transverse|ascending) part of (left|right) trapezius/,
  },
  {
    id: 'thoracic-extensors',
    name: 'Mid-back extensors',
    area: 'Upper back',
    view: 'back',
    match:
      /iliocostalis thoracis|longissimus thoracis|spinalis thoracis|semispinalis thoracis|thoracic rotator|interspinales thoracis/,
  },
  // Arms
  {
    id: 'biceps',
    name: 'Biceps and elbow flexors',
    area: 'Arms',
    view: 'front',
    match: /biceps brachii|brachialis|coracobrachialis/,
  },
  { id: 'triceps', name: 'Triceps', area: 'Arms', view: 'back', match: /triceps brachii|anconeus/ },
  // Forearms and hands
  {
    id: 'wrist-flexors',
    name: 'Forearm flexors',
    area: 'Forearms and hands',
    view: 'front',
    match:
      /flexor carpi|palmaris longus|flexor digitorum (superficialis|profundus)|flexor pollicis longus|flexor retinaculum of (left|right) wrist/,
  },
  {
    id: 'wrist-extensors',
    name: 'Forearm extensors',
    area: 'Forearms and hands',
    view: 'back',
    match:
      /extensor carpi|extensor digitorum$|extensor digiti minimi|extensor indicis|brachioradialis/,
  },
  {
    id: 'forearm-rotators',
    name: 'Forearm rotators (pronators, supinator)',
    area: 'Forearms and hands',
    view: 'front',
    match: /pronator|supinator/,
  },
  {
    id: 'thumb',
    name: 'Thumb muscles',
    area: 'Forearms and hands',
    view: 'front',
    match: /pollicis/,
  },
  {
    id: 'hand-intrinsics',
    name: 'Hand and finger muscles',
    area: 'Forearms and hands',
    view: 'front',
    match: /of (left|right) hand/,
  },
  // Core
  {
    id: 'rectus-abdominis',
    name: 'Abdominals (rectus abdominis)',
    area: 'Core',
    view: 'front',
    match: /rectus abdominis|pyramidalis/,
  },
  {
    id: 'obliques',
    name: 'Obliques and deep abdominals',
    area: 'Core',
    view: 'front',
    match: /external oblique|internal oblique|transversus abdominis/,
  },
  {
    id: 'quadratus-lumborum',
    name: 'Quadratus lumborum',
    area: 'Core',
    view: 'back',
    match: /quadratus lumborum/,
  },
  {
    id: 'pelvic-floor',
    name: 'Pelvic floor',
    area: 'Core',
    view: 'front',
    match: /coccygeus|puborectalis|levator ani|external anal sphincter/,
  },
  // Lower back
  {
    id: 'lumbar-extensors',
    name: 'Lower-back extensors',
    area: 'Lower back',
    view: 'back',
    match:
      /iliocostalis lumborum|longissimus thoracis|multifidus|lumbar rotator|interspinales lumborum|lumbar intertransversarius/,
  },
  // Hips and glutes
  {
    id: 'hip-flexors',
    name: 'Hip flexors (iliopsoas)',
    area: 'Hips and glutes',
    view: 'front',
    match: /psoas major|iliacus|sartorius|rectus femoris/,
  },
  {
    id: 'glute-max',
    name: 'Gluteus maximus',
    area: 'Hips and glutes',
    view: 'back',
    match: /gluteus maximus/,
  },
  {
    id: 'glute-med-min',
    name: 'Gluteus medius and minimus',
    area: 'Hips and glutes',
    view: 'back',
    match: /gluteus medius|gluteus minimus/,
  },
  {
    id: 'deep-hip-rotators',
    name: 'Piriformis and deep rotators',
    area: 'Hips and glutes',
    view: 'back',
    match: /piriformis|gemellus|obturator internus|obturator externus|quadratus femoris/,
  },
  {
    id: 'tfl-itb',
    name: 'TFL and IT band',
    area: 'Hips and glutes',
    view: 'side',
    match: /tensor fasciae latae|iliotibial tract/,
  },
  // Thighs
  {
    id: 'quadriceps',
    name: 'Quadriceps',
    area: 'Thighs',
    view: 'front',
    match: /rectus femoris|vastus/,
  },
  {
    id: 'hamstrings',
    name: 'Hamstrings',
    area: 'Thighs',
    view: 'back',
    match: /biceps femoris|semitendinosus|semimembranosus/,
  },
  {
    id: 'adductors',
    name: 'Adductors (inner thigh)',
    area: 'Thighs',
    view: 'front',
    match: /adductor (longus|brevis|magnus|minimus)|gracilis|pectineus/,
  },
  // Lower legs
  {
    id: 'gastrocnemius',
    name: 'Calf: gastrocnemius',
    area: 'Lower legs',
    view: 'back',
    match: /gastrocnemius|plantaris|popliteus|calcaneal tendon/,
  },
  {
    id: 'soleus',
    name: 'Calf: soleus',
    area: 'Lower legs',
    view: 'back',
    match: /soleus|calcaneal tendon/,
  },
  {
    id: 'deep-calf',
    name: 'Deep calf (tibialis posterior, toe flexors)',
    area: 'Lower legs',
    view: 'back',
    match: /tibialis posterior|flexor digitorum longus|flexor hallucis longus/,
  },
  {
    id: 'shin',
    name: 'Shin (tibialis anterior, toe extensors)',
    area: 'Lower legs',
    view: 'front',
    match: /tibialis anterior|extensor digitorum longus|extensor hallucis longus|fibularis tertius/,
  },
  {
    id: 'peroneals',
    name: 'Peroneals (fibularis longus, brevis)',
    area: 'Lower legs',
    view: 'side',
    match: /fibularis (longus|brevis)/,
  },
  // Feet
  {
    id: 'foot-sole',
    name: 'Sole of foot',
    area: 'Feet',
    view: 'front',
    match:
      /abductor hallucis|flexor digitorum brevis|flexor accessorius|flexor hallucis brevis|adductor hallucis|of (left|right) foot/,
  },
  {
    id: 'foot-top',
    name: 'Top of foot',
    area: 'Feet',
    view: 'front',
    match: /extensor digitorum brevis|extensor hallucis brevis/,
  },
]

/**
 * Nerve-glide targets. A group is a nerve trunk with the branches that move with it.
 * Nerves without a self-performed glide (cranial, autonomic, trunk, obturator, musculocutaneous) stay ungrouped.
 */
const NERVE_GROUPS: GroupDef[] = [
  {
    id: 'brachial-plexus',
    name: 'Brachial plexus',
    area: 'Neck and shoulder',
    view: 'front',
    match:
      /brachial plexus|dorsal scapular|suprascapular|subscapular nerve|long thoracic|thoracodorsal|pectoral nerve|subclavian nerve|medial brachial cutaneous|medial antebrachial cutaneous|\baxillary nerve|superior lateral brachial cutaneous/,
  },
  {
    id: 'median',
    name: 'Median nerve',
    area: 'Arm and hand',
    view: 'front',
    match: /median nerve|anterior interosseous nerve/,
  },
  { id: 'ulnar', name: 'Ulnar nerve', area: 'Arm and hand', view: 'front', match: /ulnar nerve/ },
  {
    id: 'radial',
    name: 'Radial nerve',
    area: 'Arm and hand',
    view: 'back',
    match:
      /radial nerve|posterior interosseous nerve|posterior antebrachial cutaneous|inferior lateral brachial cutaneous/,
  },
  {
    id: 'neural-axis',
    name: 'Spinal cord and dura',
    area: 'Spine',
    view: 'back',
    region: 'Spinal cord',
  },
  {
    id: 'sciatic',
    name: 'Sciatic nerve',
    area: 'Hip and thigh',
    view: 'back',
    match:
      /sciatic nerve|posterior femoral cutaneous|nerve to piriformis|nerve to quadratus femoris|superior gluteal/,
  },
  {
    id: 'femoral',
    name: 'Femoral and saphenous nerves',
    area: 'Hip and thigh',
    view: 'front',
    match: /^(left |right )?femoral nerve$|branches of femoral nerve|saphenous/,
  },
  {
    id: 'lfcn',
    name: 'Lateral femoral cutaneous nerve',
    area: 'Hip and thigh',
    view: 'front',
    match: /lateral femoral cutaneous/,
  },
  {
    id: 'tibial',
    name: 'Tibial nerve',
    area: 'Leg and foot',
    view: 'back',
    match: /tibial nerve|plantar nerve|plantar digital/,
  },
  {
    id: 'fibular',
    name: 'Common fibular (peroneal) nerve',
    area: 'Leg and foot',
    view: 'front',
    match: /fibular nerve|dorsal cutaneous nerve of foot/,
  },
  { id: 'sural', name: 'Sural nerve', area: 'Leg and foot', view: 'back', match: /sural/ },
]

const baseName = (name: string) =>
  name.replace(/\b(left|right) /i, '').replace(/^./, (c) => c.toUpperCase())

function resolve(defs: GroupDef[], pool: Structure[]): Group[] {
  return defs.map((def) => {
    const hits = pool.filter(
      (s) =>
        (def.region !== undefined && s.region === def.region) ||
        (def.match !== undefined && def.match.test(s.displayName.toLowerCase())),
    )
    return {
      ...def,
      meshes: hits.map((s) => s.meshName),
      members: [...new Set(hits.map((s) => baseName(s.displayName)))].sort(),
    }
  })
}

/** The catalogue system each guide works on. */
export const GUIDE_SYSTEM = { stretch: 'muscular', glide: 'nervous' } as const

export const guidePool = (kind: GuideKind) =>
  structures.filter((s) => s.systems.includes(GUIDE_SYSTEM[kind]))

export const groups: Record<GuideKind, Group[]> = {
  stretch: resolve(MUSCLE_GROUPS, guidePool('stretch')),
  glide: resolve(NERVE_GROUPS, guidePool('glide')),
}

export const groupById: Record<GuideKind, Map<string, Group>> = {
  stretch: new Map(groups.stretch.map((g) => [g.id, g])),
  glide: new Map(groups.glide.map((g) => [g.id, g])),
}

const indexByMesh = (list: Group[]) => {
  const map = new Map<string, string[]>()
  for (const group of list)
    for (const mesh of group.meshes) map.set(mesh, [...(map.get(mesh) ?? []), group.id])
  return map
}

/** Mesh name to the ids of every group it belongs to. */
export const groupsByMesh: Record<GuideKind, Map<string, string[]>> = {
  stretch: indexByMesh(groups.stretch),
  glide: indexByMesh(groups.glide),
}

/** Areas in head-to-toe order, as they appear in the picker. */
export const areas: Record<GuideKind, string[]> = {
  stretch: [...new Set(groups.stretch.map((g) => g.area))],
  glide: [...new Set(groups.glide.map((g) => g.area))],
}

/** Every mesh covered by the given groups, without duplicates. */
export function meshesOf(kind: GuideKind, ids: string[]): string[] {
  const out = new Set<string>()
  for (const id of ids) for (const mesh of groupById[kind].get(id)?.meshes ?? []) out.add(mesh)
  return [...out]
}

export const GUIDE_LABEL = {
  stretch: { mode: 'Stretches', one: 'stretch', many: 'stretches', target: 'muscle' },
  glide: { mode: 'Nerve glides', one: 'nerve glide', many: 'nerve glides', target: 'nerve' },
} as const
