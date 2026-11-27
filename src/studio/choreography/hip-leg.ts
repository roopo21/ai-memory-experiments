import {
  stretch as st,
  sequence as seq,
  both,
  feet,
  instep,
  type Leg,
  type Pose,
  type Recipe,
  onFloor,
} from './types'
const crossed: Leg = [87, 31, 99, 0, 56],
  upright: Leg = [94, 0, 88],
  wide: Leg = [5, 27, 6],
  raised: Leg = [89, 0, 5],
  // Seated at chair height a straight leg reaches the floor at about 61 degrees of hip flexion.
  heel: Leg = [61, 3, 4, -14],
  bent: Leg = [45, 0, 88]
// The 90/90 position, written in the pelvis's own frame (the pelvis turns toward the front shin):
// the front hip is flexed past 90 and turned out about 75 degrees, which lays the shin across in
// front of the body; the back thigh points out and a little back with the hip turned in as far as
// it goes. The back shin then reaches the floor only by tilting the pelvis toward the front leg.
const nineFront: Leg = [100, 50, 90, 0, 75],
  nineBack: Leg = [60, 55, 100, 0, -55],
  nineKnees: Leg = [140, 35, 135, 25, 15]
const nineSet: Pose = {
  leg: nineFront,
  other: nineBack,
  pelvis: [0, -40, 14] as const,
  spine: [0, 0, 0] as const,
  ga: ['floor', 0.08, -0.009, -0.47] as const,
  gb: ['floor', 0.1, -0.009, -0.7] as const,
}
const nineSwitch: Pose = {
  leg: nineKnees,
  other: nineKnees,
  pelvis: [0, 0, 0] as const,
  spine: [0, 0, 0] as const,
  ga: ['floor', 0.02, -0.009, -0.5] as const,
  gb: ['floor', -0.02, -0.009, -0.5] as const,
}
const nineOther: Pose = {
  leg: nineBack,
  other: nineFront,
  pelvis: [0, 40, -14] as const,
  spine: [0, 0, 0] as const,
  ga: ['floor', -0.1, -0.009, -0.7] as const,
  gb: ['floor', -0.08, -0.009, -0.47] as const,
}
export const hipLeg = {
  'kneeling-hip-flexor': st('halfKneel', {}, 'Tuck the pelvis and move forward', {
    leg: [-17, 1, 95],
    other: [73, 3, 94],
    pelvis: [-8, 0, 0],
    shift: [0, 0, 0.07],
  }),
  'kneeling-hip-flexor-reach': st(
    'halfKneel',
    { a: [125, 8, 5] },
    'Reach up and lean away from the kneeling leg',
    { a: [164, 4, 3], spine: [0, 0, -22], leg: [-17, 0, 96], shift: [0, 0, 0.055] },
  ),
  'standing-lunge-hip-flexor': st(
    'lunge',
    {},
    'Bend the front knee and press the back hip forward',
    { leg: [-24, 2, 13, 17], other: [47, 3, 62], pelvis: [-7, 0, 0], shift: [0, -0.045, 0.06] },
  ),
  'edge-of-bed-hip-flexor': st(
    'supine',
    { other: [107, 3, 100], ga: 'Bshin', gb: 'Bshin', leg: [12, 0, 76] },
    'Let the unsupported thigh hang',
    { leg: [-21, 0, 76], other: [117, 3, 104] },
    { gear: ['bed'] },
  ),
  'couch-stretch': st(
    'halfKneel',
    { leg: [-2, 0, 133, 22], spine: [30, 0, 0] },
    'Lift the trunk with the shin against the wall',
    { pelvis: [-8, 0, 0], spine: [1, 0, 0], leg: [-13, 0, 143, 21] },
    { gear: ['backWall'] },
  ),
  'half-kneeling-quad': st(
    'halfKneel',
    // The hand reaches back to the front of the ankle with the heel already drawn up.
    { leg: [-8, 0, 148], ga: 'Ainstep', ha: instep, f: [45, 58, 30, 0, 45] },
    'Draw the heel in and ease the hip forward',
    { leg: [-18, 0, 155, 12], pelvis: [-7, 0, 0], shift: [0, 0, 0.04] },
  ),
  'low-lunge': st(
    'halfKneel',
    // An upright trunk over the hips, hands resting on the thighs.
    { ga: 'ownThigh', gb: 'ownThigh', spine: [6, 0, 0] },
    'Slide the back knee away and sink forward',
    { leg: [-35, 2, 86], other: [99, 5, 100], spine: [2, 0, 0], shift: [0, -0.06, 0.06] },
  ),
  'lunge-with-rotation': seq('split', { ga: 'floor', gb: 'floor', spine: [45, 0, 0] }, [
    ['Lower the near elbow', { a: [62, -6, 91], ga: 'free', spine: [59, -13, 0] }],
    ['Turn and reach upward', { a: [22, 119, 3], spine: [32, 49, 0], neck: [-8, 32, 0] }],
    [
      'Bring the hand down and straighten the front knee',
      { ga: 'floor', leg: [70, 0, 18, -14], spine: [43, 0, 0], shift: [0, 0, -0.1] },
    ],
  ]),
  'supine-figure-four': {
    ...seq('supine', { leg: bent, other: bent }, [
      // Angles found so the ankle rests on the front of the other thigh just above the knee.
      ['Cross the ankle over the opposite knee', { leg: [105, 10, 125, 10, 30] }],
      [
        'Draw both legs toward the chest',
        { leg: [130, 30, 125, 10, 60], other: [100, 0, 94], ga: 'Bthigh', gb: 'Bthigh' },
      ],
    ]),
    // A static stretch: hold the drawn-in position before letting go.
    hold: true,
  },
  // Seated, the crossed knee and shin lie beyond a relaxed arm's reach; the arms hang free.
  'seated-figure-four': st('figureFour', {}, 'Hinge forward over the crossed leg', {
    spine: [34, 0, 0],
    neck: [5, 0, 0],
  }),
  'standing-figure-four': st(
    'stand',
    { leg: crossed, ga: 'table', gb: 'table' },
    'Sit back onto the standing leg',
    { other: [44, 0, 61], leg: [112, 37, 106, 0, 54], spine: [26, 0, 0], shift: [0, -0.09, -0.04] },
    { gear: ['table'] },
  ),
  pigeon: st(
    'pigeon',
    // Front hip flexed, opened and turned out with the shin angled across; back leg long behind,
    // instep down. Upright on the hands first, then folding over the front shin.
    {
      // The front foot is flexed, as yoga teachers cue, to keep the knee comfortable.
      leg: [108, 30, 125, 0, 72],
      other: [-30, -14, 6, 48],
      spine: [-14, 0, 0],
      // The pelvis rolls down toward the front leg, as it does when the front hip settles.
      pelvis: [0, -15, 22],
      ga: 'floor',
      gb: 'floor',
    },
    'Lower the hips and fold forward over the front shin',
    { spine: [30, 0, 0], neck: [12, 0, 0] },
  ),
  'knee-to-opposite-shoulder': st(
    'supine',
    { leg: [87, 0, 91], gb: 'Aknee', ga: 'Ashin' },
    'Draw the knee toward the opposite shoulder',
    { leg: [115, -21, 105, 0, 8] },
  ),
  'cross-legged-fold': st(
    'floorSeat',
    { leg: [89, 42, 140, 48, 72, -9], other: [108, 36, 124, 60, 54, -27] },
    'Walk the hands forward over the crossed shins',
    { spine: [43, 0, 0], ga: [0.18, 0.035, 0.44], gb: [-0.18, 0.035, 0.44] },
  ),
  'ninety-ninety': seq(
    'floorSeat',
    nineSet,
    [
      [
        'Square the chest and hinge over the front shin',
        { spine: [34, -22, 0], ga: 'ownShin', gb: 'ownShin' },
      ],
      ['Sit tall again', { spine: [0, 0, 0], ga: nineSet.ga, gb: nineSet.gb }],
      ['Lift both knees, feet down, hips a little off the floor', nineSwitch],
      ['Let the knees fall across into the other 90/90', nineOther],
      ['Lift both knees again', nineSwitch],
    ],
    { both: true },
  ),
  'lying-leg-crossover': seq('supine', { a: [0, 86, 2], b: [0, 86, 2] }, [
    ['Lift the straight leg', { leg: [78, 0, 6] }],
    ['Lower it across the body', { leg: [80, -42, 8], pelvis: [0, -32, 0], spine: [0, 24, 0] }],
  ]),
  'standing-itb': st(
    'stand',
    { leg: [-10, -16, 4], ga: 'post' },
    'Shift the crossed-leg hip toward the wall',
    { spine: [0, 0, -20], shift: [0.07, 0, 0] },
    { gear: ['sideWall'] },
  ),
  'strap-itb': st(
    'supine',
    { leg: [77, 0, 6], gb: 'gripFront' },
    'Guide the straight leg across the midline',
    { leg: [76, -28, 6], b: [36, -13, 75] },
    { gear: ['footStrap'] },
  ),
  'kneeling-tfl': st('halfKneel', { pelvis: [-8, 0, 0] }, 'Shift the hip and reach overhead', {
    a: [154, 9, 7],
    spine: [0, 0, -22],
    leg: [-17, 0, 91],
    shift: [0.045, 0, 0.065],
  }),
  frog: st(
    'allFours',
    {
      leg: [83, 39, 88, 0, 39],
      other: [83, 39, 88, 0, 39],
      a: [85, 9, 84],
      b: [85, 9, 84],
      f: onFloor,
      g: onFloor,
    },
    'Lower onto forearms and rock back',
    {
      leg: [108, 45, 93, 0, 43],
      other: [108, 45, 93, 0, 43],
      pelvis: [-11, 0, 0],
      shift: [0, -0.06, -0.1],
    },
    both,
  ),
  butterfly: st(
    'butterfly',
    { ga: 'ownShin', gb: 'ownShin' },
    'Hinge over the soles of the feet',
    { spine: [32, 0, 0] },
    both,
  ),
  'side-lunge': st(
    'stand',
    { leg: wide, other: wide },
    'Bend one knee with the stretching leg straight',
    { leg: [7, 35, 5], other: [48, 25, 67], shift: [-0.16, -0.12, 0], spine: [12, 0, 0] },
  ),
  'seated-straddle': st(
    'straddle',
    {},
    'Walk the hands forward between the legs',
    { spine: [43, 0, 0], ga: [0.14, 0.035, 0.46], gb: [-0.14, 0.035, 0.46] },
    both,
  ),
  'wide-leg-forward-fold': st(
    'stand',
    { leg: [3, 31, 4], other: [3, 31, 4] },
    'Hinge forward between the wide legs',
    { pelvis: [45, 0, 0], spine: [34, 0, 0], neck: [21, 0, 0], ga: 'ownShin', gb: 'ownShin' },
    both,
  ),
  'adductor-rock-back': st(
    'allFours',
    { leg: [60, 68, 4, 0, 15], ga: 'floor', gb: 'floor' },
    'Rock back toward the kneeling heel',
    { other: [111, 0, 125], leg: [79, 69, 5], shift: [0, -0.04, -0.093] },
  ),
  'wall-straddle': st(
    'supine',
    { leg: raised, other: raised, ga: 'ownKnee', gb: 'ownKnee' },
    'Slide both straight legs apart on the wall',
    { leg: [89, 42, 4], other: [89, 42, 4] },
    { both: true, gear: ['wall'] },
  ),
  'cossack-squat': seq(
    'stand',
    { leg: wide, other: wide },
    [
      [
        'Sit over one heel',
        { leg: [82, 28, 106], other: [11, 43, 5, -18], shift: [0.18, -0.2, 0], spine: [16, 0, 0] },
      ],
      ['Shift through centre', { leg: wide, other: wide, shift: [0, 0, 0], spine: [0, 0, 0] }],
      [
        'Sit over the other heel',
        { other: [82, 28, 106], leg: [11, 43, 5, -18], shift: [-0.18, -0.2, 0], spine: [16, 0, 0] },
      ],
    ],
    both,
  ),
  'supine-hip-internal-rotation': st(
    'supine',
    { leg: [49, 17, 88], other: [49, 17, 88] },
    'Drop one knee inward with the foot planted',
    { leg: [48, -8, 88, 0, -31] },
  ),
  'leg-swings-front': seq(
    'stand',
    { gb: 'post' },
    [
      ['Swing forward', { leg: [42, 2, 6] }],
      ['Swing back', { leg: [-23, 3, 12] }],
      ['Widen the forward arc', { leg: [57, 2, 5] }],
    ],
    { gear: ['sideWall'] },
  ),
  'leg-swings-side': seq(
    'stand',
    { ga: 'wall', gb: 'wall' },
    [
      ['Swing out to the side', { leg: [5, 42, 6] }],
      ['Cross in front', { leg: [14, -22, 5] }],
      ['Open again', { leg: [5, 48, 6] }],
    ],
    { gear: ['wall'] },
  ),
  'hip-circles': seq(
    'stand',
    { gb: 'post' },
    [
      ['Lift the knee', { leg: [80, 3, 88] }],
      ['Open the hip', { leg: [68, 41, 88, 0, 23] }],
      ['Circle down and back', { leg: [-12, 19, 46] }],
      ['Reverse the circle', { leg: [66, 40, 86, 0, 23] }],
    ],
    { gear: ['sideWall'] },
  ),
  'standing-quad': st(
    'stand',
    { leg: [3, 1, 153], spine: [-5, 0, 0], ga: 'Ainstep', ha: instep, gb: 'table' },
    'Bring the heel toward the seat',
    { leg: [-1, 1, 160, 10] },
    { gear: ['chair'] },
  ),
  'side-lying-quad': st(
    'side',
    { other: [46, 0, 66], leg: [0, 0, 145], ga: 'Ainstep', ha: instep },
    'Guide the top thigh slightly back',
    { leg: [-14, 0, 155, 12] },
  ),
  'prone-quad-strap': st(
    'prone',
    { leg: [0, 0, 77], a: [132, 8, 85], b: [132, 8, 85] },
    'Draw the heel toward the seat with the strap',
    { leg: [-4, 0, 124], a: [146, 8, 93], b: [146, 8, 93] },
    { gear: ['quadStrap'] },
  ),
  'heel-sit-lean-back': st(
    'heelSit',
    { ga: [0.24, 0.03, -0.25], gb: [-0.24, 0.03, -0.25] },
    'Lean back with the hands supporting you',
    { spine: [-25, 0, 0], pelvis: [-10, 0, 0] },
    both,
  ),
  'doorway-hamstring': st(
    'supine',
    { leg: [77, 0, 4], other: [0, 0, 2] },
    'Slide the hips toward the frame',
    { leg: [91, 0, 3], shift: [0, 0, 0.045] },
    { gear: ['door'] },
  ),
  // The hand rests on the thigh of the straight leg through the hinge.
  'chair-hamstring': st('chair', { leg: heel, ga: 'ownThigh' }, 'Hinge over the straight leg', {
    spine: [48, 0, 0],
    leg: [61, 3, 4, -19],
  }),
  'standing-hamstring-step': st(
    'stand',
    { leg: [36, 0, 5, -14], other: [0, 0, 4] },
    'Hinge toward the raised heel',
    { pelvis: [18, 0, 0], spine: [20, 0, 0], ga: 'ownKnee' },
    { gear: ['step'] },
  ),
  'seated-forward-fold': st(
    'longSit',
    { ga: 'ownShin', gb: 'ownShin' },
    'Hinge forward and reach along both shins',
    { pelvis: [18, 0, 0], spine: [34, 0, 0], neck: [17, 0, 0], ga: 'ownToe', gb: 'ownToe' },
    both,
  ),
  'single-leg-seated-hamstring': st(
    'longSit',
    // The bent leg's sole rests against the inner thigh of the straight one.
    { other: [97, 43, 136, 54, 65, 9] },
    'Face the straight leg and reach toward the foot',
    { spine: [44, 10, 6], ga: 'ownToe', gb: 'Ashin' },
  ),
  'downward-dog': seq(
    'allFours',
    { ga: 'floor', gb: 'floor', toes: [-36, 0, 0], otherToes: [-36, 0, 0] },
    [
      [
        'Lift the hips back',
        {
          pelvis: [21, 0, 0],
          leg: [110, 1, 58],
          other: [110, 1, 58],
          a: [142, 6, 3],
          b: [142, 6, 3],
          shift: [0, 0.17, -0.13],
        },
      ],
      [
        'Straighten the knees and lower the heels',
        {
          leg: [128, 2, 10, -14],
          other: [128, 2, 10, -14],
          a: [153, 6, 3],
          b: [153, 6, 3],
          shift: [0, 0.28, -0.17],
        },
      ],
    ],
    both,
  ),
  'half-split': st(
    'split',
    // Hands rest on the thighs as the trunk hinges over the front leg.
    { leg: [64, 0, 13, -16], other: [-2, 0, 94], ga: 'ownThigh', gb: 'ownThigh' },
    'Shift back and hinge over the front heel',
    {
      leg: [76, 0, 6, -17],
      spine: [38, 0, 0],
      shift: [0, 0, -0.075],
    },
  ),
  'active-knee-extension': st(
    'supine',
    { leg: upright, ga: 'Athigh', gb: 'Athigh' },
    'Straighten the supported knee',
    { leg: [96, 0, 17] },
  ),
  inchworm: seq(
    'stand',
    {},
    [
      [
        'Fold and plant the hands',
        {
          pelvis: [66, 0, 0],
          spine: [34, 0, 0],
          leg: [65, 0, 42],
          other: [65, 0, 42],
          ga: 'floor',
          gb: 'floor',
        },
      ],
      [
        'Walk the hands to plank',
        {
          pelvis: [77, 0, 0],
          spine: [0, 0, 0],
          leg: [0, 0, 2, 59],
          other: [0, 0, 2, 59],
          shift: [0, -0.48, 0.34],
          ga: [0.2, 0.027, 0.91],
          gb: [-0.2, 0.027, 0.91],
        },
      ],
      [
        'Walk the feet back toward the hands',
        {
          pelvis: [71, 0, 0],
          spine: [29, 0, 0],
          leg: [112, 0, 15],
          other: [112, 0, 15],
          shift: [0, -0.12, 0.37],
          ga: [0.2, 0.027, 0.91],
          gb: [-0.2, 0.027, 0.91],
        },
      ],
    ],
    both,
  ),
  'heel-cord': st(
    'lunge',
    { ga: 'wall', gb: 'wall', leg: [-17, 0, 3, -10], other: [24, 0, 32] },
    'Press the hips forward over a straight back knee',
    { leg: [-24, 0, 3, -18], other: [44, 0, 52], shift: [0, -0.035, 0.07] },
    { gear: ['wall'] },
  ),
  'heel-cord-bent-knee': st(
    'lunge',
    { ga: 'wall', gb: 'wall', leg: [-6, 0, 23, -12] },
    'Sink with the back knee bent',
    { leg: [-13, 0, 37, -21], other: [44, 0, 57], shift: [0, -0.075, 0.07] },
    { gear: ['wall'] },
  ),
  'towel-calf': st(
    'longSit',
    { ga: 'gripFront', gb: 'gripFront' },
    'Draw the ball of the foot toward the shin',
    { leg: [90, 0, 2, -22], a: [25, 3, 71], b: [25, 3, 71] },
    { gear: ['footStrap'] },
  ),
  'wall-toes-up-calf': st(
    'stand',
    { leg: [14, 0, 4, -26], ga: 'wall', gb: 'wall' },
    'Lean toward the wall with the forefoot raised',
    { leg: [19, 0, 4, -31], spine: [16, 0, 0], shift: [0, 0, 0.045] },
    { gear: ['wall'] },
  ),
  'step-heel-drop': seq(
    'stand',
    { ga: 'post' },
    [
      ['Lower one heel below the step', { leg: [0, 0, 3, -19] }],
      ['Soften that knee', { leg: [14, 0, 22, -24] }],
    ],
    { gear: ['step', 'pole'] },
  ),
  'knee-to-wall': st(
    'lunge',
    { leg: [16, 0, 20, -9] },
    'Bring the forward knee to the wall',
    { leg: [39, 0, 54, -23], other: [-17, 0, 12], shift: [0, -0.06, 0.09] },
    { gear: ['wall'] },
  ),
  'kneeling-shin': seq(
    'kneel',
    { leg: [0, 0, 92, 41], other: [0, 0, 92, 41] },
    [
      ['Sit back over the tops of the feet', { leg: [63, 0, 140, 43], other: [63, 0, 140, 43] }],
      ['Lean back slightly', { spine: [-13, 0, 0] }],
    ],
    both,
  ),
  'standing-shin': st(
    'stand',
    { leg: [-14, 0, 23, 37], gb: 'post' },
    'Bend both knees and press the toes down',
    { leg: [-19, 0, 32, 46], other: [12, 0, 19], shift: [0, -0.04, 0] },
    { gear: ['sideWall'] },
  ),
  // The far hand guides the toes; the crossed shin lies beyond the near hand's reach.
  'seated-ankle-point': st(
    'figureFour',
    { gb: 'Atoe' },
    'Guide the ankle and toes down',
    { leg: [87, 31, 99, 34, 56], toes: [22, 0, 0] },
    feet,
  ),
  'seated-peroneal': st(
    'figureFour',
    { gb: 'Atoe' },
    'Point and turn the sole toward the face',
    { leg: [87, 31, 99, 26, 56, -16] },
    feet,
  ),
  'seated-tibialis-posterior': st(
    'figureFour',
    { ga: 'Aheel', gb: 'Atoe' },
    'Draw the foot up and turn the sole away',
    { leg: [87, 31, 99, -19, 56, 17] },
    feet,
  ),
  'toes-on-wall': st(
    'stand',
    { leg: [9, 0, 11, -9], toes: [-31, 0, 0] },
    'Bend the knee over the extended toes',
    { leg: [24, 0, 35, -18], toes: [-42, 0, 0] },
    { gear: ['wall'], ...feet },
  ),
  'ankle-alphabet': seq(
    'chair',
    { leg: [88, 0, 54] },
    Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ', (letter) => ['Trace ' + letter, {}]),
    { ...feet, cycle: 'alphabet' },
  ),
  'seated-plantar-fascia': st(
    'figureFour',
    { ga: 'Atoe', gb: 'Aheel' },
    'Draw toes back and trace the arch',
    { toes: [-41, 0, -9], leg: [87, 31, 99, -12, 56], gb: ['Aheel', 0, 0, 0.074] },
    feet,
  ),
  'golf-ball-roll': seq(
    'chair',
    { leg: [83, 0, 76] },
    [
      ['Roll from heel toward forefoot', { leg: [82, 0, 57] }],
      ['Roll back under the arch', { leg: [84, 0, 91] }],
    ],
    { ...feet, gear: ['smallBall'], cycle: 'rollBall' },
  ),
  'toes-tucked-kneel': st(
    'kneel',
    {
      leg: [0, 0, 91, 6],
      other: [0, 0, 91, 6],
      toes: [-54, 0, 0],
      otherToes: [-54, 0, 0],
      // Hands rest on the thighs, kneeling up and sitting back alike.
      ga: 'ownThigh',
      gb: 'ownThigh',
    },
    'Sit toward the heels with toes tucked',
    { leg: [55, 0, 137, 4], other: [55, 0, 137, 4], spine: [23, 0, 0] },
    { both: true },
  ),
  'toe-spreading': st(
    'chair',
    {},
    'Fan the toes on the floor',
    { toes: [0, 16, 0], otherToes: [0, 16, 0] },
    { ...both, ...feet },
  ),
  'seated-toe-curl': st(
    'figureFour',
    { gb: 'Atoe' },
    'Curl the toes down and point the ankle',
    { toes: [36, 0, 7], leg: [87, 31, 99, 20, 56] },
    feet,
  ),
  'big-toe-extension': st(
    'figureFour',
    { gb: 'Atoe' },
    'Lift only the great toe toward the shin',
    { toes: [0, 0, -48], leg: [87, 31, 99, -16, 56] },
    feet,
  ),
  'fingers-between-toes': seq(
    'figureFour',
    { gb: 'Atoe', g: [8, 11, 6, 14], toes: [0, 14, 0] },
    [
      ['Bend toes forward', { toes: [19, 14, 0] }],
      ['Draw them back', { toes: [-22, 14, 0] }],
      ['Circle the forefoot', { leg: [87, 31, 99, 12, 56, 13] }],
    ],
    feet,
  ),
} satisfies Record<string, Recipe>
