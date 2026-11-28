import {
  stretch as st,
  sequence as seq,
  both,
  grip,
  type Aim,
  type Recipe,
  type Arm,
  type Leg,
  onFloor,
} from './types'
/** Arm angles: flexion, abduction, elbow, pronation (0 palm forward, 90 thumb up), wrist, rotation. */
// Arms out to the sides on the floor, palms up.
const across: Arm = [0, 85, 8, 5],
  // Arms overhead, palms facing each other.
  raised: Arm = [160, 8, 6, 90],
  bent: Leg = [47, 0, 89],
  hug: Leg = [115, 7, 98]
// Palms on the back of the pelvis, fingers pointing down.
const palmsOnHips = (s: number): Aim => [[-s * 0.35, -1, 0], [0, 0, 1], 'pelvis', 'palm']
export const trunk = {
  'childs-pose': st(
    'heelSit',
    // Knees slightly apart so the trunk settles between the thighs, buttocks toward the heels.
    { leg: [68, 8, 150], other: [68, 8, 150], a: [75, 8, 8], b: [75, 8, 8] },
    'Fold over the thighs and reach forward',
    { pelvis: [48, 0, 0], spine: [44, 0, 0], neck: [12, 0, 0], a: raised, b: raised, breath: 1 },
    both,
  ),
  'childs-pose-side-reach': st(
    'heelSit',
    { pelvis: [40, 0, 0], spine: [29, 0, 0], a: raised, b: raised },
    'Walk the hands toward the opposite side',
    { spine: [31, -14, -22], a: [150, -16, 4], b: [151, 26, 4] },
  ),
  'kneeling-lat-bench': st(
    'kneel',
    // Elbows on the bench, forearms up and hands together.
    { spine: [42, 0, 0], a: [98, 10, 80], b: [98, 10, 80] },
    'Sit back and let the chest sink between the arms',
    {
      pelvis: [48, 0, 0],
      spine: [34, 0, 0],
      leg: [66, 0, 148],
      other: [66, 0, 148],
      a: [160, 9, 120],
      b: [160, 9, 120],
    },
    { both: true, gear: ['lowBench'] },
  ),
  'doorframe-lat': st(
    'stand',
    { ga: ['post', 0, -0.31, 0] },
    'Hinge and sit away from the post',
    {
      pelvis: [23, 0, 0],
      spine: [29, 0, -9],
      shift: [-0.035, -0.1, -0.15],
      leg: [28, 0, 32],
      other: [25, 0, 32],
    },
    { gear: ['pole'] },
  ),
  'overhead-wrist-pull': st(
    'stand',
    { a: raised, b: [147, -8, 25], gb: 'Awrist' },
    'Pull the wrist up and across',
    { a: [160, -6, 5], spine: [0, 0, -25] },
  ),
  'bar-hang': st(
    'stand',
    { ga: 'bar', gb: 'bar', a: [165, 8, 8, 150], b: [165, 8, 8, 150], f: grip, g: grip },
    'Lengthen beneath the bar with toes supported',
    { shift: [0, -0.035, 0], shoulders: [13, 0], leg: [3, 0, 9, 13], other: [3, 0, 9, 13] },
    { both: true, gear: ['bar'] },
  ),
  'puppy-pose': st(
    'allFours',
    // Start on all fours with the palms flat under the shoulders.
    { ga: 'floor', gb: 'floor', f: onFloor, g: onFloor },
    'Walk the palms out and lower the chest',
    {
      spine: [-35, 0, 0],
      pelvis: [17, 0, 0],
      neck: [8, 0, 0],
      // The hips flex a touch more as the pelvis tips, so the knees and feet stay put.
      leg: [92, 2, 90, 25],
      other: [92, 2, 90, 25],
      ga: ['floor', -0.03, 0, 0.42],
      gb: ['floor', -0.03, 0, 0.42],
    },
    both,
  ),
  'upper-back-hug': st(
    'chair',
    {
      ga: ['gripFront', 0, 0.12, 0.12],
      gb: ['gripFront', 0, 0.12, 0.12],
      // Fingers interlaced with the palms facing the body.
      ha: [
        [-1, 0.15, 0.2],
        [0, 0, -1],
      ],
      hb: [
        [1, 0.15, 0.2],
        [0, 0, -1],
      ],
      f: [40, 50, 25],
      g: [40, 50, 25],
    },
    'Round the back and push the joined hands away',
    {
      ga: ['gripFront', 0, 0.14, 0.24],
      gb: ['gripFront', 0, 0.14, 0.24],
      spine: [26, 0, 0],
      neck: [15, 0, 0],
      shoulders: [0, -14],
    },
    both,
  ),
  'single-arm-pole-pull': st(
    'stand',
    { ga: 'post' },
    'Lean away and let the shoulder reach forward',
    { spine: [20, -20, -6], shift: [-0.055, -0.055, -0.1], shoulders: [0, -13] },
    { gear: ['pole'] },
  ),
  'thread-the-needle': st(
    'allFours',
    { gb: 'floor', ga: 'floor' },
    'Thread the arm beneath the other, shoulder and head to the floor',
    {
      // The back of the threading hand slides along the floor, palm up.
      ga: [-0.42, 0.009, 0.37],
      ha: [[-1, 0, 0.05], [0, 1, 0], 'world', 'back'],
      f: [10, 18, 10],
      spine: [20, -58, 12],
      neck: [4, -30, 12],
      pelvis: [44, 0, 0],
    },
  ),
  'cat-cow': seq(
    'allFours',
    { ga: 'floor', gb: 'floor' },
    [
      ['Round the spine', { spine: [30, 0, 0], pelvis: [-12, 0, 0], neck: [35, 0, 0] }],
      ['Open the chest', { spine: [-27, 0, 0], pelvis: [9, 0, 0], neck: [-26, 0, 0] }],
    ],
    both,
  ),
  'seated-cat-cow': seq(
    'chair',
    { ga: 'ownKnee', gb: 'ownKnee' },
    [
      ['Round and tuck', { spine: [31, 0, 0], neck: [24, 0, 0] }],
      ['Tilt forward and lift the chest', { spine: [-18, 0, 0], neck: [-15, 0, 0] }],
    ],
    both,
  ),
  'kneeling-back-extension': seq(
    'allFours',
    { ga: 'floor', gb: 'floor' },
    [
      ['Rock onto the hands', { shift: [0, 0, 0.09], spine: [-19, 0, 0], neck: [-13, 0, 0] }],
      [
        'Sit toward the heels',
        {
          shift: [0, -0.12, -0.15],
          leg: [112, 0, 135],
          other: [112, 0, 135],
          spine: [15, 0, 0],
          neck: [18, 0, 0],
        },
      ],
    ],
    both,
  ),
  'seated-forward-fold-chair': seq(
    'chair',
    { leg: [81, 16, 80], other: [81, 16, 80] },
    [
      [
        'Fold between the knees',
        { spine: [67, 0, 0], neck: [25, 0, 0], a: [66, 3, 5], b: [66, 3, 5] },
      ],
      [
        'Press on the thighs to rise',
        { ga: 'ownKnee', gb: 'ownKnee', spine: [28, 0, 0], neck: [10, 0, 0] },
      ],
    ],
    both,
  ),
  'seated-chair-twist': st('chair', { gb: 'Aknee', ga: 'backHip' }, 'Turn toward the chair back', {
    spine: [0, 42, 0],
    neck: [0, 19, 0],
    ga: ['backHip', 0.05, 0.05, -0.045],
  }),
  'open-book': st(
    'side',
    { leg: [85, 0, 85], other: [85, 0, 85], a: [88, 0, 4], b: [88, 0, 4] },
    'Open the top arm and follow the hand',
    { a: [-12, 83, 4], spine: [0, 55, 0], neck: [0, 38, 0] },
  ),
  'all-fours-thoracic-rotation': seq('allFours', { ga: 'occiput', gb: 'floor' }, [
    ['Bring the elbow toward the opposite wrist', { spine: [5, -34, 0], neck: [10, -17, 0] }],
    ['Turn the elbow up', { spine: [-5, 49, 0], neck: [-7, 27, 0] }],
  ]),
  cobra: st(
    'prone',
    { ga: 'floor', gb: 'floor', a: [-9, 12, 89], b: [-9, 12, 89] },
    'Press up while the pelvis stays down',
    { spine: [-38, 0, 0], neck: [-14, 0, 0] },
    both,
  ),
  sphinx: st(
    'prone',
    { a: [15, 6, 77], b: [15, 6, 77], f: onFloor, g: onFloor },
    'Prop on the forearms and lengthen the chest',
    { spine: [-31, 0, 0], neck: [-12, 0, 0], breath: 1 },
    both,
  ),
  'standing-back-bend': st(
    'stand',
    { ga: 'backHip', gb: 'backHip', ha: palmsOnHips(1), hb: palmsOnHips(-1) },
    'Lift the chest and lean back',
    { spine: [-29, 0, 0], neck: [6, 0, 0], shift: [0, 0, 0.032] },
    both,
  ),
  'full-body-reach': st(
    'supine',
    // Arms overhead resting on the floor, palms up.
    { a: [168, 10, 8, 20], b: [168, 10, 8, 20] },
    'Lengthen fingers and toes in opposite directions',
    {
      // The elbows stay soft rather than locked.
      a: [176, 6, 8, 20],
      b: [176, 6, 8, 20],
      leg: [0, 1, 0, 20],
      other: [0, 1, 0, 20],
      shoulders: [6, 0],
      breath: 1,
    },
    both,
  ),
  'ball-backbend': seq(
    'bridgeBall',
    { leg: [65, 12, 85], other: [65, 12, 85] },
    [
      [
        'Walk forward over the ball',
        { pelvis: [-46, 0, 0], leg: [36, 12, 70], other: [36, 12, 70], shift: [0, -0.09, 0.1] },
      ],
      [
        'Recline and reach overhead',
        {
          pelvis: [-74, 0, 0],
          spine: [-16, 0, 0],
          a: [155, 10, 6],
          b: [155, 10, 6],
          leg: [25, 13, 76],
          other: [25, 13, 76],
          shift: [0, -0.14, 0.16],
        },
      ],
    ],
    { both: true, gear: ['ball'] },
  ),
  scorpion: st('prone', { a: across, b: across }, 'Bend the knee and cross the foot behind', {
    leg: [-17, -30, 90, 10, 27],
    pelvis: [0, -36, 0],
    spine: [0, 17, 0],
  }),
  'supine-twist': st(
    'supine',
    { a: across, b: across, leg: [78, 0, 95] },
    'Lower the knee across and turn the head away',
    { leg: [80, -41, 95, 12, -16], pelvis: [0, -29, 0], spine: [0, 21, 0], neck: [0, 41, 0] },
  ),
  'seated-rotation': seq('longSit', {}, [
    [
      'Cross the bent leg, hand behind for support',
      {
        // The knee drawn up with the foot planted beside the other knee.
        leg: [137, -16, 106, 35, 3, 14],
        // The supporting palm sits flat just behind the hip, fingers turned out; the trunk leans
        // back a little so the arm is bent and takes weight.
        pelvis: [-24, 0, 0],
        ga: [0.2, 0.009, -0.19],
        ha: [
          [1, 0, -0.3],
          [0, -1, 0],
        ],
        gb: 'Aknee',
        f: onFloor,
      },
    ],
    ['Rotate toward the knee and look over the shoulder', { spine: [0, 38, 0], neck: [0, 26, 0] }],
  ]),
  'straddle-side-bend': st('straddle', { a: raised }, 'Reach over the opposite straight leg', {
    spine: [11, -8, -32],
    b: [27, 16, 5],
  }),
  'standing-crossover-side-lean': st(
    'stand',
    { leg: [-9, -16, 12], a: raised },
    'Reach away from the crossed back leg',
    { spine: [0, 0, -26], shift: [0.038, 0, 0] },
  ),
  // Start with the knee bent and the hands at the sides; clasp the shin and draw it to the chest.
  'knee-to-chest': st(
    'supine',
    { leg: [82, 3, 91] },
    'Draw the shin toward the chest',
    { leg: [133, 7, 105], ga: 'Ashin', gb: 'Ashin' },
  ),
  'double-knee-to-chest': seq(
    'supine',
    { leg: bent, other: bent },
    [
      ['Bring up the first knee', { leg: hug, ga: 'Ashin' }],
      ['Bring up the second knee', { other: hug, gb: 'Bshin', spine: [8, 0, 0] }],
    ],
    both,
  ),
  'pelvic-tilts': seq(
    'supine',
    { leg: bent, other: bent },
    [
      ['Flatten the lower back', { pelvis: [-10, 0, 0], spine: [12, 0, 0] }],
      ['Release into a small arch', { pelvis: [7, 0, 0], spine: [-10, 0, 0] }],
    ],
    both,
  ),
  'knee-rolls': seq(
    'supine',
    { leg: bent, other: bent, a: across, b: across },
    [
      [
        'Lower knees together to one side',
        { pelvis: [0, 30, 0], spine: [0, -25, 0], leg: [47, 20, 89], other: [47, -20, 89] },
      ],
      [
        'Roll through the middle to the other side',
        { pelvis: [0, -30, 0], spine: [0, 25, 0], leg: [47, -20, 89], other: [47, 20, 89] },
      ],
    ],
    both,
  ),
  'happy-baby': st(
    'supine',
    { leg: [105, 28, 88], other: [105, 28, 88], ga: 'ownToe', gb: 'ownToe' },
    'Widen the knees toward the armpits',
    { leg: [121, 41, 85, -8, 16], other: [121, 41, 85, -8, 16] },
    both,
  ),
  'deep-squat-hold': st(
    'squat',
    {
      ga: 'post',
      gb: 'post',
      // A handshake grip on the upright: fingers forward, palms toward each other, thumbs up.
      ha: [[0, 0, 1], [-1, 0, 0], 'world'],
      hb: [[0, 0, 1], [1, 0, 0], 'world'],
      leg: [0, 6, 0],
      other: [0, 6, 0],
    },
    'Sit back and down between the heels',
    // Holding the frame at arm's length lets the hips go back and low as a counterweight: heels
    // flat, knees over the toes, the spine long and leaning only a little.
    {
      leg: [125, 8, 140, -30],
      other: [125, 8, 140, -30],
      spine: [14, 0, 0],
      shift: [0, 0, -0.2],
      breath: 1,
    },
    { both: true, gear: ['door'] },
  ),
  'pelvic-floor-breathing': st(
    'supine',
    { leg: [24, 3, 50], other: [24, 3, 50], ga: 'belly' },
    'Inhale, soften and breathe out',
    { breath: 2 },
    { both: true, gear: ['kneePillow'] },
  ),
  'reclined-butterfly': st(
    'supine',
    { leg: [52, 14, 88], other: [52, 14, 88] },
    'Let both knees fall outward',
    { leg: [55, 43, 99, 0, 48], other: [55, 43, 99, 0, 48], breath: 1 },
    both,
  ),
  'modified-seat-side-straddle': seq(
    'straddle',
    { leg: [89, 35, 3], other: [97, 43, 136, 54, 65, 9] },
    [
      ['Hinge toward the straight leg', { spine: [37, 23, 18], ga: 'ownShin' }],
      ['Round toward the knee', { spine: [56, 23, 19], neck: [24, 0, 0] }],
    ],
  ),
  'standing-forward-fold': st(
    'stand',
    { leg: [8, 0, 12], other: [8, 0, 12] },
    'Hinge, fold and let the arms hang',
    { pelvis: [52, 0, 0], spine: [39, 0, 0], neck: [23, 0, 0], a: [89, 4, 5], b: [89, 4, 5] },
    both,
  ),
} satisfies Record<string, Recipe>
