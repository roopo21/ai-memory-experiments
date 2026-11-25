import { sequence as seq, open, fist, hands, type Recipe, type Leg } from './types'
const lifted: Leg = [96, 0, 82],
  straight: Leg = [43, 0, 6],
  sideQuad: Leg = [-2, 1, 112]
export const nerve = {
  'plexus-shoulder-slider': seq('chair', {}, [
    ['Lower shoulder and tilt toward it', { shoulders: [-13, 0], neck: [0, 0, 18] }],
    ['Shrug and tilt away', { shoulders: [14, 0], neck: [0, 0, -16] }],
  ]),
  'brachial-plexus-sequence': seq('stand', { a: [10, 5, 94, 0, -35], f: fist, neck: [0, 0, 18] }, [
    ['Bring head to centre', { neck: [0, 0, 0] }],
    ['Move across the chest and down', { a: [23, -29, 42, 0, -22] }],
    ['Carry the arm out', { a: [10, 41, 27, 0, -10] }],
    ['Open the hand at shoulder height', { a: [0, 83, 5], f: open }],
    ['Tilt away', { neck: [0, 0, -16] }],
  ]),
  'median-glide-sequence': seq(
    'chair',
    { a: [7, 6, 97, 92], f: [69, 78, 52, 0, 44] },
    [
      ['Straight fingers, thumb tucked', { f: [0, 0, 0, 1, 35] }],
      ['Extend the wrist', { a: [7, 6, 97, 92, 41] }],
      ['Open the thumb', { f: [0, 0, 0, 1, 0, 37] }],
      ['Turn the palm up', { a: [7, 6, 97, 0, 41] }],
      ['Assist the thumb', { gb: 'Athumb', f: [0, 0, 0, 1, -4, 42] }],
    ],
    hands,
  ),
  'median-gentle-slider': seq('chair', { a: [0, 3, 91], f: open }, [
    [
      'Wrist back and head toward the hand',
      { a: [0, 3, 91, 0, 38], f: [-12, 0, 0], neck: [0, 0, 16] },
    ],
    [
      'Curl and bring the head to centre',
      { a: [0, 3, 91, 0, -27], f: [32, 35, 20], neck: [0, 0, 0] },
    ],
  ]),
  'median-elbow-wrist-slider': seq('chair', { a: [45, 2, 28] }, [
    ['Bend the elbow with wrist extended', { a: [46, 2, 103, 0, 38], f: [-11, 0, 0] }],
    ['Straighten the elbow and soften the fingers', { a: [46, 2, 9, 0, -27], f: [32, 37, 23] }],
  ]),
  'median-slider': seq('stand', { a: [4, 70, 65, 0, 0, 46] }, [
    ['Straighten wrist and elbow, tilt toward', { a: [3, 76, 8, 0, 44, 50], neck: [0, 0, 16] }],
    ['Bend the elbow and tilt away', { a: [4, 70, 68, 0, 0, 46], neck: [0, 0, -14] }],
  ]),
  'median-tensioner': seq('stand', { a: [4, 71, 55, 0, 0, 46] }, [
    ['Extend the elbow, wrist and fingers', { a: [4, 73, 9, 0, 36, 46], f: [-10, 0, 0] }],
    ['Tilt away gently', { neck: [0, 0, -12] }],
    ['Release arm and head', { a: [4, 71, 55, 0, 0, 46], f: open, neck: [0, 0, 0] }],
  ]),
  'ulnar-glide-hand-to-ear': seq('stand', { a: [2, 83, 4, 142, 0, 42] }, [
    ['Tip the wrist back', { a: [2, 83, 4, 142, 42, 42] }],
    ['Bend the elbow toward the ear', { a: [3, 83, 117, 138, 39, 58], ga: 'ear' }],
    ['Unfold the arm', { a: [2, 83, 4, 142, 0, 42], ga: 'free' }],
  ]),
  'ulnar-glide-sequence': seq(
    'stand',
    { a: [75, 0, 5, 100, -35], f: [43, 44, 35] },
    [
      ['Straighten fingers and tip wrist back', { a: [75, 0, 5, 100, 43], f: open }],
      ['Bend the elbow', { a: [60, 3, 87, 100, 43] }],
      ['Reach out and curl', { a: [15, 72, 42, 98, -28], f: [35, 43, 31] }],
      ['Circle the arm back', { a: [-18, 78, 34, 98, -28] }],
      ['Circle again and tilt away', { a: [4, 76, 40, 98, -28], neck: [0, 0, -15] }],
    ],
    { cycle: 'ulnarCircle' },
  ),
  'ulnar-slider': seq('stand', { a: [2, 80, 5, 135, 0, 49] }, [
    [
      'Bring palm toward ear and tilt toward',
      { a: [3, 81, 116, 137, 37, 58], ga: 'ear', neck: [0, 0, 14] },
    ],
    ['Open the elbow and tilt away', { a: [2, 80, 5, 135, 0, 49], ga: 'free', neck: [0, 0, -14] }],
  ]),
  'ulnar-tensioner': seq('stand', { f: [0, 0, 0, 4, 56, 0, 75] }, [
    ['Raise the OK sign', { a: [14, 72, 78, 125, 18, 61] }],
    [
      'Bring the circle to the eye',
      { a: [20, 88, 121, 140, 32, 68], ga: 'eye', shoulders: [-5, 0] },
    ],
    ['Lower and straighten', { a: [0, 12, 13], ga: 'free', f: open }],
  ]),
  'radial-glide-sequence': seq('stand', {}, [
    ['Lower the shoulder', { shoulders: [-13, 0] }],
    ['Turn the thumb in and flex the wrist', { a: [0, 4, 4, 133, -48, -27], f: [35, 37, 26] }],
    ['Tilt the head away', { neck: [0, 0, -16] }],
    ['Reach back and out', { a: [-24, 18, 4, 133, -48, -27] }],
  ]),
  'radial-slider': seq('stand', { a: [0, 9, 4, 119, 0, -20] }, [
    [
      'Curl the wrist and tilt toward',
      { a: [-4, 10, 4, 129, -42, -20], f: [43, 48, 28], neck: [0, 0, 15] },
    ],
    ['Open the hand and tilt away', { a: [0, 9, 4, 119, 3, -20], f: open, neck: [0, 0, -15] }],
  ]),
  'slump-tensioner': seq('chair', { spine: [24, 0, 0], neck: [24, 0, 0] }, [
    ['Straighten one knee', { leg: [82, 0, 18] }],
    ['Draw the toes up', { leg: [82, 0, 18, -18] }],
    ['Bend the knee and sit tall', { leg: [80, 0, 80], spine: [0, 0, 0], neck: [0, 0, 0] }],
  ]),
  'sciatic-slider-supine': seq('supine', { leg: lifted, ga: 'Athigh', gb: 'Athigh' }, [
    ['Straighten knee and draw toes up, head down', { leg: [99, 0, 22, -18], neck: [-3, 0, 0] }],
    [
      'Bend knee and point toes, tuck chin',
      { leg: [96, 0, 86, 22], neck: [22, 0, 0], spine: [7, 0, 0] },
    ],
  ]),
  'sciatic-slider-standing': seq(
    'stand',
    { pelvis: [30, 0, 0], spine: [19, 0, 0], ga: 'table', gb: 'table' },
    [
      [
        'Bend both knees and lower chin',
        { leg: [27, 0, 39], other: [27, 0, 39], neck: [29, 0, 0], shift: [0, -0.07, 0] },
      ],
      [
        'Straighten knees and look ahead',
        { leg: [2, 0, 4], other: [2, 0, 4], neck: [-27, 0, 0], shift: [0, 0, 0] },
      ],
    ],
    { both: true, gear: ['table'] },
  ),
  'sciatic-tensioner-supine': seq('supine', { leg: lifted, ga: 'Athigh', gb: 'Athigh' }, [
    ['Straighten the supported knee', { leg: [96, 0, 25] }],
    ['Pull the toes up', { leg: [96, 0, 25, -16] }],
    ['Bend the knee and point the foot', { leg: [96, 0, 85, 19] }],
  ]),
  'femoral-slider-prone': seq('prone', { ga: 'crown', gb: 'crown' }, [
    ['Bend knee and look up', { leg: [-3, 0, 98], spine: [-9, 0, 0], neck: [-21, 0, 0] }],
    ['Lower the leg and head together', { leg: [0, 0, 4], spine: [0, 0, 0], neck: [0, 0, 0] }],
  ]),
  'femoral-slider-side-lying': seq(
    'side',
    { leg: sideQuad, other: [87, 0, 89], ga: 'Aheel', gb: 'Bshin' },
    [
      ['Draw thigh back and look up', { leg: [-19, 0, 115], neck: [-19, 0, 0] }],
      ['Bring thigh forward and tuck the chin', { leg: [17, 0, 102], neck: [20, 0, 0] }],
    ],
  ),
  'femoral-tensioner-side-lying': seq(
    'side',
    { leg: sideQuad, other: [87, 0, 89], ga: 'Aheel', gb: 'Bshin' },
    [
      ['Tuck the chin', { neck: [19, 0, 0] }],
      ['Draw the bent thigh back', { leg: [-16, 0, 113] }],
      ['Release the thigh forward', { leg: [13, 0, 101], neck: [0, 0, 0] }],
    ],
  ),
  'tibial-slider-seated': seq('chair', { leg: straight }, [
    [
      'Toes up and sole out, look up',
      { leg: [43, 0, 6, -19, 0, 16], toes: [-14, 0, 0], neck: [-18, 0, 0] },
    ],
    ['Point and relax, lower chin', { leg: [43, 0, 6, 19], toes: [4, 0, 0], neck: [21, 0, 0] }],
  ]),
  'tibial-tensioner-strap': seq(
    'supine',
    { ga: 'gripFront', gb: 'gripFront' },
    [
      ['Raise the straight leg', { leg: [78, 0, 6] }],
      ['Lower it slightly', { leg: [68, 0, 6] }],
      ['Use the strap to draw up and out', { leg: [68, 0, 6, -18, 0, 15], toes: [-13, 0, 0] }],
      ['Release the foot before lowering', { leg: [68, 0, 6, 4], toes: [0, 0, 0] }],
    ],
    { gear: ['footStrap'] },
  ),
  'fibular-slider-seated': seq('chair', { leg: straight }, [
    ['Point and turn the sole in, look up', { leg: [43, 0, 6, 25, 0, -16], neck: [-18, 0, 0] }],
    ['Return to neutral and lower chin', { leg: straight, neck: [21, 0, 0] }],
  ]),
  'fibular-tensioner-supine': seq('supine', { leg: lifted, ga: 'Athigh', gb: 'Athigh' }, [
    ['Straighten the supported knee', { leg: [96, 0, 25] }],
    ['Point the foot and turn the sole in', { leg: [96, 0, 25, 23, 0, -15] }],
    ['Release the foot', { leg: [96, 0, 25] }],
    ['Bend the knee', { leg: lifted }],
  ]),
  'sural-slider-seated': seq('chair', { leg: straight }, [
    ['Draw the foot up and inward, look up', { leg: [43, 0, 6, -19, 0, -15], neck: [-18, 0, 0] }],
    ['Point and relax, lower chin', { leg: [43, 0, 6, 19], neck: [21, 0, 0] }],
  ]),
} satisfies Record<string, Recipe>
