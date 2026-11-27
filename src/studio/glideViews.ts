import type { Structure } from '../anatomy/catalogue'
import { glides } from '../guides/library/glides'
import type { Side } from './clips'

type Region = 'arm' | 'arm-neck' | 'leg' | 'leg-spine'

// The guide library owns the target nerve names. An explicit region per clip lets
// two glides for the same nerve expose different proximal landmarks.
const regions: Record<Region, string[]> = {
  arm: ['median-glide-sequence', 'median-elbow-wrist-slider', 'ulnar-glide-hand-to-ear'],
  'arm-neck': [
    'plexus-shoulder-slider',
    'brachial-plexus-sequence',
    'median-gentle-slider',
    'median-slider',
    'median-tensioner',
    'ulnar-glide-sequence',
    'ulnar-slider',
    'ulnar-tensioner',
    'radial-glide-sequence',
    'radial-slider',
  ],
  leg: [
    'femoral-slider-prone',
    'femoral-slider-side-lying',
    'tibial-slider-seated',
    'tibial-tensioner-strap',
    'fibular-slider-seated',
    'fibular-tensioner-supine',
    'sural-slider-seated',
  ],
  'leg-spine': [
    'slump-tensioner',
    'sciatic-slider-seated',
    'sciatic-slider-supine',
    'sciatic-slider-standing',
    'sciatic-tensioner-supine',
    'femoral-tensioner-side-lying',
  ],
}

export const glideViews = new Map(
  Object.entries(regions).flatMap(([region, ids]) =>
    ids.map((id) => {
      const guide = glides.find((g) => g.id === id)
      if (!guide) throw Error('Unknown glide view: ' + id)
      return [
        id,
        { region: region as Region, primary: guide.primary, secondary: guide.secondary },
      ] as const
    }),
  ),
)

export function inGlideRegion(s: Structure, region: Region, side?: Side) {
  const name = s.displayName.toLowerCase()
  if (side && name.includes(side === 'left' ? 'right' : 'left')) return false
  if (region.startsWith('arm'))
    return (
      s.region === 'Upper limbs' ||
      /deltoid|pectoralis|subclavius|rotator cuff|scapul|trapezius|teres (major|minor)/.test(
        name,
      ) ||
      (region === 'arm-neck' && s.region === 'Neck')
    )
  return (
    s.region === 'Lower limbs' ||
    /psoas|iliacus|lumborum|lumbar|multifidus|glute/.test(name) ||
    (region === 'leg-spine' && (s.region === 'Neck' || /spinalis|longissimus/.test(name)))
  )
}
