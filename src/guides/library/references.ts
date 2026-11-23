import type { Reference } from './types'

/** Public pages and papers that entries cite. Every URL was opened when the library was written. */
export const references: Reference[] = [
  {
    id: 'acsm-2011',
    label:
      'Garber et al. ACSM position stand: quantity and quality of exercise. Med Sci Sports Exerc 2011;43(7):1334–59',
    url: 'https://doi.org/10.1249/MSS.0b013e318213fefb',
  },
  {
    id: 'aaos-knee',
    label: 'AAOS OrthoInfo: Knee Conditioning Program',
    url: 'https://www.orthoinfo.org/en/recovery/knee-conditioning-program/',
  },
  {
    id: 'aaos-shoulder',
    label: 'AAOS OrthoInfo: Rotator Cuff and Shoulder Conditioning Program',
    url: 'https://www.orthoinfo.org/en/recovery/rotator-cuff-and-shoulder-conditioning-program/',
  },
  {
    id: 'aaos-spine',
    label: 'AAOS OrthoInfo: Spine Conditioning Program',
    url: 'https://www.orthoinfo.org/en/recovery/spine-conditioning-program/',
  },
  {
    id: 'aaos-hip',
    label: 'AAOS OrthoInfo: Hip Conditioning Program',
    url: 'https://www.orthoinfo.org/en/recovery/hip-conditioning-program/',
  },
  {
    id: 'aaos-foot',
    label: 'AAOS OrthoInfo: Foot and Ankle Conditioning Program',
    url: 'https://www.orthoinfo.org/en/recovery/foot-and-ankle-conditioning-program/',
  },
  {
    id: 'aaos-carpal',
    label: 'AAOS OrthoInfo: Therapeutic Exercise Program for Carpal Tunnel Syndrome (2022)',
    url: 'https://www.orthoinfo.org/globalassets/pdfs/2022-therapeutic-exercise-program-for-carpal-tunnel.pdf',
  },
  {
    id: 'aaos-radial',
    label: 'AAOS OrthoInfo: Therapeutic Exercise Program for Radial Tunnel Syndrome (2024)',
    url: 'https://www.orthoinfo.org/globalassets/pdfs/2024-therapeutic-exercise-program-for-radial-tunnel-syndrome.pdf',
  },
  {
    id: 'nhs-flex',
    label: 'NHS: Flexibility exercises',
    url: 'https://www.nhs.uk/live-well/exercise/flexibility-exercises/',
  },
  {
    id: 'healthlink-hipflexor',
    label: 'HealthLinkBC: Hip flexor stretch (kneeling)',
    url: 'https://www.healthlinkbc.ca/healthwise/hip-flexor-stretch-kneeling',
  },
  {
    id: 'physitrack-pec',
    label: 'Physitrack: Pectoralis stretching',
    url: 'https://us.physitrack.com/home-exercise-video/pectoralis-stretching',
  },
  {
    id: 'ekhuft-cubital',
    label: 'East Kent Hospitals NHS: Cubital tunnel syndrome',
    url: 'https://leaflets.ekhuft.nhs.uk/cubital-tunnel-syndrome/html',
  },
  {
    id: 'rwt-nerve',
    label: 'The Royal Wolverhampton NHS Trust: Nerve Gliding Exercises',
    url: 'https://royalwolverhampton.nhs.uk/wp-content/uploads/2025/06/Nerve-Gliding-Exercises.pdf',
  },
  {
    id: 'southtees-sciatic',
    label: 'South Tees Hospitals NHS: Sciatic nerve slider',
    url: 'https://www.southtees.nhs.uk/resources/sciatic-nerve-slider/',
  },
  {
    id: 'southtees-femoral',
    label: 'South Tees Hospitals NHS: Femoral nerve slider',
    url: 'https://www.southtees.nhs.uk/resources/femoral-nerve-slider/',
  },
  {
    id: 'coppieters-2008',
    label:
      "Coppieters & Butler. Do 'sliders' slide and 'tensioners' tension? Man Ther 2008;13(3):213–21",
    url: 'https://doi.org/10.1016/j.math.2006.12.008',
  },
  {
    id: 'coppieters-2009',
    label:
      'Coppieters, Hough & Dilley. Different nerve-gliding exercises induce different magnitudes of median nerve longitudinal excursion. J Orthop Sports Phys Ther 2009;39(3):164–71',
    url: 'https://doi.org/10.2519/jospt.2009.2913',
  },
  {
    id: 'coppieters-2015',
    label:
      'Coppieters et al. Excursion of the sciatic nerve during nerve mobilization exercises. J Orthop Sports Phys Ther 2015;45(10):731–7',
    url: 'https://doi.org/10.2519/jospt.2015.5743',
  },
  {
    id: 'basson-2017',
    label:
      'Basson et al. The effectiveness of neural mobilization for neuromusculoskeletal conditions. J Orthop Sports Phys Ther 2017;47(9):593–615',
    url: 'https://doi.org/10.2519/jospt.2017.7117',
  },
]

export const referenceById = new Map(references.map((r) => [r.id, r]))
