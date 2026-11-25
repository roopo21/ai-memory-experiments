import {
  sequence as seq,
  open,
  fist,
  softFist,
  hands,
  type Aim,
  type Fingers,
  type Recipe,
  type Leg,
} from './types'
/**
 * Nerve glides follow the written guide. Sliders pair tension at one end of the nerve with slack
 * at the other (wrist back with the head tilted toward the arm); tensioners add tension at both.
 *
 * Arm angles: shoulder flexion, abduction, elbow flexion, pronation (0 palm forward in the
 * anatomical position, 90 thumb up, about 165 palm down), wrist extension (+) or flexion (−),
 * humeral external rotation, radial (+) or ulnar (−) deviation.
 */
// Hip bent to about 90 degrees with the hands behind the thigh.
const held: Leg = [92, 0, 85],
  // Seated with one knee straight and the heel resting on the floor.
  heelDown: Leg = [55, 0, 4]
// Fingers straight with the thumb resting against the side of the index finger.
const thumbTucked: Fingers = {
  mcp: [0, 2, 4, 6],
  pip: [0, 2, 4, 4],
  dip: [0, 0, 2, 2],
  spread: 0,
  thumb: [14, -12, 4, 6, 2],
}
// Fingers and thumb straight, the thumb moved out from the hand.
const thumbOut: Fingers = {
  mcp: [-6, -4, -2, 0],
  pip: [0, 2, 4, 4],
  dip: [0, 0, 2, 2],
  spread: 6,
  thumb: [-26, 26, -12, 0, -10],
}
// Wrist and fingers back with the thumb drawn further by the other hand.
const thumbStretched: Fingers = { ...thumbOut, thumb: [-34, 34, -14, -8, -14] }
// Palm up with the arm out to the side: external rotation turns the forearm skyward.
const sideUp = (elbow: number, wrist: number) => [0, 80, elbow, 10, wrist, 80] as const
// Palm down with the arm out to the side.
const sideDown = (elbow: number, wrist: number) => [0, 88, elbow, 92, wrist, 0] as const
// Palm on the side of the head over the ear, fingers up and back.
const toEar: Aim = [[0, 1, -0.45], [-1, 0, -0.1], 'head']
// The OK mask: fingers down the cheek, palm toward the face, the ring of thumb and index at the eye.
const mask: Aim = [[0.1, -1, 0.2], [-0.25, 0, -1], 'head']
export const nerve = {
  'plexus-shoulder-slider': seq('chair', { a: [0, 8, 10], f: [10, 14, 8] }, [
    ['Lower the shoulder and tilt the head toward it', { shoulders: [-12, 0], neck: [0, 0, 18] }],
    ['Shrug and tilt the head away', { shoulders: [14, 0], neck: [0, 0, -16] }],
  ]),
  'brachial-plexus-sequence': seq(
    'stand',
    // Head toward the arm, the hand curled up near the shoulder.
    { a: [25, 20, 135, 100, -30], f: softFist, neck: [0, 0, 18] },
    [
      ['Bring the head to the centre', { neck: [0, 0, 0] }],
      ['Move the hand across the chest and down to the hip', { a: [20, -18, 40, 110, -20] }],
      ['Carry the arm out to the side', { a: [5, 45, 20, 60, 0, 30], f: [20, 26, 12] }],
      ['Open the hand at shoulder height', { a: sideUp(5, 40), f: open }],
      ['Tilt the head away', { neck: [0, 0, -16] }],
    ],
  ),
  'median-glide-sequence': seq(
    'chair',
    // Elbow at the side bent to a right angle, forearm forward, thumb up, as in Totten and
    // Hunter's six positions. The camera looks down on the thumb side, like the handouts.
    { a: [4, 8, 92, 90, 0], f: fist },
    [
      ['Straighten the fingers, thumb against the side', { f: thumbTucked }],
      ['Tip the wrist back', { a: [4, 8, 92, 90, 55] }],
      ['Move the thumb out', { f: thumbOut }],
      ['Turn the palm up', { a: [4, 8, 92, 12, 55] }],
      ['Ease the thumb further with the other hand', { gb: 'Athumb', f: thumbStretched }],
    ],
    { ...hands, view: [0.9, 2.2, 0.9] },
  ),
  'median-gentle-slider': seq(
    'chair',
    // Elbow at the side bent to 90 degrees, palm up.
    { a: [0, 8, 90, 10], f: open },
    [
      [
        'Wrist and fingers back, head toward the hand',
        { a: [0, 8, 90, 10, 50], f: [-15, 0, 0, 4, 0, 10], neck: [0, 0, 16] },
      ],
      [
        'Curl the wrist and fingers, head to the centre',
        { a: [0, 8, 90, 10, -40], f: [40, 50, 30], neck: [0, 0, 0] },
      ],
    ],
  ),
  'median-elbow-wrist-slider': seq(
    'stand',
    // Arm in front, palm up, elbow slightly bent.
    { a: [50, 6, 20, 10], f: open },
    [
      [
        'Wrist back as the elbow bends the hand toward the shoulder',
        { a: [50, 6, 118, 10, 50], f: [-12, 0, 0, 4, 0, 8] },
      ],
      [
        'Straighten the elbow as the wrist and fingers curl',
        { a: [50, 6, 10, 10, -40], f: [40, 50, 30] },
      ],
    ],
  ),
  'median-slider': seq(
    'stand',
    // Arm out to the side just below shoulder height, elbow bent, palm up.
    { a: sideUp(70, 0), f: open },
    [
      [
        'Straighten the elbow, wrist back, head toward the arm',
        { a: sideUp(5, 62), f: [-10, 0, 0, 4, 0, 10], neck: [0, 0, 16] },
      ],
      [
        'Bend the elbow, relax the wrist, head away',
        { a: sideUp(70, 0), f: open, neck: [0, 0, -14] },
      ],
    ],
  ),
  'median-tensioner': seq('stand', { a: sideUp(60, 0), f: open }, [
    [
      'Straighten the elbow, wrist and fingers back',
      { a: sideUp(5, 60), f: [-12, 0, 0, 4, 0, 10] },
    ],
    ['Tilt the head away gently', { neck: [0, 0, -12] }],
    ['Release the elbow and bring the head back', { a: sideUp(60, 0), f: open, neck: [0, 0, 0] }],
  ]),
  'ulnar-glide-hand-to-ear': seq(
    'stand',
    // Arm straight out to the side, palm down.
    { a: sideDown(5, 0), f: open },
    [
      ['Tip the wrist back, fingers to the ceiling', { a: sideDown(5, 65) }],
      [
        'Bend the elbow to bring the palm toward the ear',
        { a: [5, 88, 125, 95, 60, 35], ga: 'ear', ha: toEar },
      ],
      ['Straighten the elbow and wrist', { a: sideDown(5, 0), ga: 'free' }],
    ],
  ),
  'ulnar-glide-sequence': seq(
    'stand',
    // Arm forward, elbow straight, wrist and fingers bent.
    { a: [85, 4, 5, 150, -45], f: softFist },
    [
      ['Straighten the fingers and tip the wrist back', { a: [85, 4, 5, 150, 60], f: open }],
      ['Bend the elbow, wrist still back', { a: [75, 6, 100, 150, 60] }],
      [
        'Reach out to the side and curl the wrist and fingers',
        { a: [10, 80, 15, 120, -40], f: softFist },
      ],
      ['Circle the arm backward', { a: [-20, 80, 15, 120, -40] }],
      ['Circle again and tilt the head away', { a: [5, 80, 15, 120, -40], neck: [0, 0, -15] }],
    ],
    { cycle: 'ulnarCircle' },
  ),
  'ulnar-slider': seq('stand', { a: sideDown(5, 0), f: open }, [
    [
      'Bend the elbow and wrist back, palm toward the ear, head toward the hand',
      { a: [5, 88, 122, 95, 58, 35], ga: 'ear', ha: toEar, neck: [0, 0, 14] },
    ],
    [
      'Straighten the elbow, relax the wrist, head away',
      { a: sideDown(5, 0), ga: 'free', neck: [0, 0, -14] },
    ],
  ]),
  'ulnar-tensioner': seq(
    'stand',
    // The OK sign: thumb and index tips together.
    { f: [0, 0, 0, 4, 56, 0, 58] },
    [
      ['Raise the arm and turn the hand over', { a: [10, 80, 90, 120, 30, 60] }],
      [
        'Bring the circle to the eye, elbow out to the side',
        { a: [15, 88, 128, 140, 40, 70], ga: 'eye', ha: mask, shoulders: [-5, 0] },
      ],
      ['Lower the arm and straighten the elbow', { a: [0, 10, 12], ga: 'free', f: open }],
    ],
  ),
  'radial-glide-sequence': seq('stand', {}, [
    ['Press the shoulder down, fingertips toward the floor', { shoulders: [-12, 0], a: [0, 6, 4] }],
    [
      'Turn the arm in, thumb toward the body, and bend the wrist',
      { a: [0, 6, 4, 160, -55, -55, -10], f: softFist },
    ],
    ['Tilt the head away', { neck: [0, 0, -16] }],
    ['Take the arm back and a little out', { a: [-25, 18, 4, 160, -55, -55, -10] }],
  ]),
  'radial-slider': seq(
    'stand',
    // Arm straight at the side, turned in so the thumb points toward the body.
    { a: [0, 8, 4, 150, 0, -45], f: open },
    [
      [
        'Bend the wrist into a loose fist, head toward the shoulder',
        { a: [0, 8, 4, 150, -50, -45, -8], f: softFist, neck: [0, 0, 15] },
      ],
      [
        'Straighten the wrist, open the hand, head away',
        { a: [0, 8, 4, 150, 0, -45], f: open, neck: [0, 0, -15] },
      ],
    ],
  ),
  'slump-tensioner': seq(
    'chair',
    // Slumped: back rounded and chin down, hands resting on the thighs.
    { spine: [28, 0, 0], neck: [26, 0, 0], ga: 'ownKnee', gb: 'ownKnee' },
    [
      ['Straighten one knee', { leg: [80, 0, 15] }],
      ['Draw the toes up', { leg: [80, 0, 15, -15] }],
      ['Bend the knee, then sit tall', { leg: [80, 0, 80], spine: [0, 0, 0], neck: [0, 0, 0] }],
    ],
  ),
  'sciatic-slider-supine': seq('supine', { leg: held, ga: 'Athigh', gb: 'Athigh' }, [
    [
      'Straighten the knee and draw the toes up, head resting',
      { leg: [92, 0, 22, -15], neck: [0, 0, 0] },
    ],
    [
      'Bend the knee and point the toes, lift the head',
      { leg: [92, 0, 88, 25], neck: [24, 0, 0], spine: [6, 0, 0] },
    ],
  ]),
  'sciatic-slider-standing': seq(
    'stand',
    { pelvis: [32, 0, 0], spine: [16, 0, 0], ga: 'table', gb: 'table' },
    [
      [
        'Bend both knees and lower the chin',
        { leg: [28, 0, 40], other: [28, 0, 40], neck: [28, 0, 0], shift: [0, -0.07, 0] },
      ],
      [
        'Straighten the knees and look ahead',
        { leg: [2, 0, 4], other: [2, 0, 4], neck: [-26, 0, 0], shift: [0, 0, 0] },
      ],
    ],
    { both: true, gear: ['table'] },
  ),
  'sciatic-tensioner-supine': seq('supine', { leg: held, ga: 'Athigh', gb: 'Athigh' }, [
    ['Straighten the knee to a mild pull', { leg: [92, 0, 26] }],
    ['Draw the toes up', { leg: [92, 0, 26, -15] }],
    ['Bend the knee and point the foot', { leg: [92, 0, 85, 20] }],
  ]),
  'femoral-slider-prone': seq('prone', { ga: 'crown', gb: 'crown' }, [
    [
      'Bend one knee while lifting the head to look up',
      { leg: [-3, 0, 100], spine: [-8, 0, 0], neck: [-22, 0, 0] },
    ],
    ['Lower the leg and the head together', { leg: [0, 0, 4], spine: [0, 0, 0], neck: [0, 0, 0] }],
  ]),
  'femoral-slider-side-lying': seq(
    'side',
    // Top leg bent with the hand at the ankle; the bottom knee hugged to the chest.
    { leg: [-2, 1, 112], other: [90, 0, 92], ga: 'Aheel', gb: 'Bshin' },
    [
      ['Draw the top thigh back and look up', { leg: [-18, 0, 115], neck: [-20, 0, 0] }],
      ['Bring the thigh forward and tuck the chin', { leg: [18, 0, 102], neck: [20, 0, 0] }],
    ],
  ),
  'femoral-tensioner-side-lying': seq(
    'side',
    { leg: [-2, 1, 112], other: [90, 0, 92], ga: 'Aheel', gb: 'Bshin' },
    [
      ['Tuck the chin', { neck: [20, 0, 0] }],
      ['Draw the top thigh back to a mild pull', { leg: [-16, 0, 114] }],
      ['Let the thigh come forward', { leg: [14, 0, 101], neck: [0, 0, 0] }],
    ],
  ),
  'tibial-slider-seated': seq('chair', { leg: heelDown }, [
    [
      'Toes up and sole slightly out, look up',
      { leg: [55, 0, 4, -18, 0, 14], toes: [-14, 0, 0], neck: [-18, 0, 0] },
    ],
    [
      'Point the foot and relax the toes, chin down',
      { leg: [55, 0, 4, 22], toes: [4, 0, 0], neck: [20, 0, 0] },
    ],
  ]),
  'tibial-tensioner-strap': seq(
    'supine',
    { ga: 'gripFront', gb: 'gripFront' },
    [
      ['Raise the straight leg to a first mild pull', { leg: [72, 0, 4] }],
      ['Lower it a little', { leg: [62, 0, 4] }],
      [
        'Use the strap to draw the foot up and out',
        { leg: [62, 0, 4, -16, 0, 14], toes: [-12, 0, 0] },
      ],
      ['Release the foot', { leg: [62, 0, 4, 4], toes: [0, 0, 0] }],
    ],
    { gear: ['footStrap'] },
  ),
  'fibular-slider-seated': seq('chair', { leg: heelDown }, [
    [
      'Point the foot and turn the sole in, look up',
      { leg: [55, 0, 4, 28, 0, -16], neck: [-18, 0, 0] },
    ],
    ['Bring the foot back to neutral, chin down', { leg: heelDown, neck: [20, 0, 0] }],
  ]),
  'fibular-tensioner-supine': seq('supine', { leg: held, ga: 'Athigh', gb: 'Athigh' }, [
    ['Straighten the knee to a mild pull', { leg: [92, 0, 26] }],
    ['Point the foot and turn the sole in', { leg: [92, 0, 26, 25, 0, -16] }],
    ['Release the foot', { leg: [92, 0, 26] }],
    ['Bend the knee', { leg: held }],
  ]),
  'sural-slider-seated': seq('chair', { leg: heelDown }, [
    ['Foot up and sole in, look up', { leg: [55, 0, 4, -16, 0, -14], neck: [-18, 0, 0] }],
    ['Point the foot and relax, chin down', { leg: [55, 0, 4, 22], neck: [20, 0, 0] }],
  ]),
} satisfies Record<string, Recipe>
