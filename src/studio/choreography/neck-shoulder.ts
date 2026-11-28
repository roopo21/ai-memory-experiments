import { stretch as st, sequence as seq, both, grip, open, onFloor, type Aim, type Recipe } from './types'
/**
 * Neck values are degrees of flexion (+) or extension, rotation toward the working (left) side,
 * and side bend toward it (+). Arms are anatomical: flexion, abduction, elbow, pronation, wrist
 * extension, humeral external rotation, radial deviation.
 */
// Faced from the front so side bends and turns read as they are performed.
const front = [0.35, 0.22, 2.4] as const
// Fingertips resting on the upper chest, palm toward the body.
const onChest = (s: number): Aim => [[-s * 0.5, 1, 0.1], [0, 0, -1], 'chest', 'tips']
export const neckShoulder = {
  'neck-side-bend': st(
    'chair',
    { ga: 'seat', shoulders: [-4, 0] },
    'Tilt the head away from the anchored shoulder',
    { neck: [0, 0, -28] },
    { view: front },
  ),
  'neck-rotation': st(
    'chair',
    {},
    'Turn toward the shoulder',
    { neck: [0, 62, 0] },
    {
      view: front,
    },
  ),
  'levator-scapulae-stretch': seq(
    'chair',
    { ga: 'seat', shoulders: [-4, 0] },
    [
      ['Turn the head halfway away', { neck: [0, -40, 0] }],
      [
        'Lower the chin toward the opposite armpit, hand on the head',
        { neck: [30, -40, -10], gb: 'occiput', eb: [-0.6, 0.2, 0.6] },
      ],
      ['Let the hand ease the head a little further', { neck: [36, -42, -12] }],
    ],
    { view: [-0.6, 0.6, 2.3] },
  ),
  'upper-trap-arm-behind-back': st(
    'stand',
    { a: [-20, 10, 80, 160, 0, -70], ga: 'backHip', gb: 'Awrist' },
    'Draw the arm down and across, tilt the head away',
    { shoulders: [-8, 3], neck: [0, 0, -27], ga: ['backHip', -0.06, -0.03, 0] },
    { view: [0.2, 0.25, -2.4] },
  ),
  'scalene-stretch': seq(
    'chair',
    { ga: 'seat', shoulders: [-4, 0] },
    [
      ['Tilt the head away', { neck: [0, 0, -24] }],
      ['Lift the chin', { neck: [-16, 6, -24] }],
    ],
    { view: front },
  ),
  'scm-stretch': seq(
    'chair',
    // Both hands rest on the collarbone of the side being stretched.
    {
      ga: ['collar', 0.02, 0, 0],
      gb: ['collar', 0.08, 0, 0],
      ha: onChest(1),
      hb: onChest(-1),
    },
    [
      ['Tilt the head away', { neck: [0, 0, -22] }],
      ['Turn the face toward the anchored side and lift the chin', { neck: [-18, 30, -20] }],
    ],
    { view: front },
  ),
  'chin-tuck': st(
    'chair',
    {},
    'Slide the chin straight back',
    { neck: [-8, 0, 0], head: [14, 0, 0] },
    { both: true, view: [2.4, 0.2, 0.1] },
  ),
  'suboccipital-nod': st(
    'supine',
    { leg: [45, 0, 86], other: [45, 0, 86], ga: 'occiput', gb: 'occiput' },
    'Tuck the chin and let the hands lengthen the neck',
    { neck: [4, 0, 0], head: [16, 0, 0] },
    both,
  ),
  'neck-flexion': st(
    'chair',
    { ga: 'occiput', gb: 'occiput' },
    'Lower the chin and let the elbows drop forward',
    { neck: [36, 0, 0], spine: [5, 0, 0], ea: [0.3, -0.2, 0.9], eb: [-0.3, -0.2, 0.9] },
    { both: true, view: [2.4, 0.3, 0.6] },
  ),
  'neck-extension': st(
    'chair',
    {
      ga: ['collar', 0, -0.035, 0],
      gb: ['collar', 0, -0.035, 0],
      ha: [[-0.5, 1, 0.1], [0, 0, -1], 'chest'],
      hb: [[0.5, 1, 0.1], [0, 0, -1], 'chest'],
    },
    'Lift the chin toward the ceiling, lips closed',
    { neck: [-36, 0, 0] },
    { both: true, view: [2.4, 0.3, 0.6] },
  ),
  'head-rolls': seq(
    'chair',
    {},
    [
      ['Tilt to one shoulder', { neck: [0, 0, 20] }],
      ['Tilt to the other', { neck: [0, 0, -20] }],
      ['Roll and reverse', { neck: [0, 0, 0] }],
    ],
    { both: true, cycle: 'headRolls', view: front },
  ),
  'shoulder-rolls': seq(
    'stand',
    {},
    [
      ['Lift both shoulders', { shoulders: [16, 0] }],
      ['Roll back and down', { shoulders: [-4, 14] }],
      ['Roll forward and reverse', { shoulders: [4, -10] }],
    ],
    { both: true, cycle: 'shoulderRolls' },
  ),
  'jaw-controlled-opening': st(
    'chair',
    {},
    'Open the lower jaw slowly',
    { jaw: [22] },
    { both: true, focus: 'face' },
  ),
  'jaw-assisted-opening': seq(
    'chair',
    {},
    [
      ['Open the jaw', { jaw: [20] }],
      [
        'Hook the fingertips over the lower teeth and ease it down',
        {
          jaw: [26],
          ga: 'jaw',
          ha: [[-0.25, 0.15, -1], [0, -1, -0.15], 'head', 'tips'],
          f: [10, 25, 20, 0, 10],
        },
      ],
    ],
    { focus: 'face' },
  ),
  'jaw-side-glide': seq(
    'chair',
    { jaw: [4] },
    [
      ['Glide to the side', { jaw: [4, 8] }],
      ['Cross through the centre', { jaw: [4, -8] }],
    ],
    { both: true, focus: 'face' },
  ),
  'crossover-arm': st(
    'stand',
    { a: [88, -35, 12, 90], gb: 'Aelbow' },
    'Draw the upper arm across the chest',
    { a: [92, -58, 15, 90, 0, 10] },
  ),
  'sleeper-stretch': st(
    'side',
    // Lying on the working shoulder, that arm forward at 90 degrees with the forearm pointing up.
    { a: [90, 4, 90, 90], leg: [28, 0, 48], other: [34, 0, 55], gb: 'Awrist' },
    'Press the forearm down toward the surface',
    { a: [90, 4, 90, 90, 0, -55] },
  ),
  'passive-internal-rotation': st(
    'stand',
    {
      ga: ['back', 0.095, 0, 0],
      gb: ['back', -0.155, 0, 0],
      ha: [[-0.2, -1, 0], [0, 0, -1], 'pelvis'],
      hb: [[0.2, -1, 0], [0, 0, -1], 'pelvis'],
      f: grip,
      g: grip,
    },
    'Draw the stick sideways behind the hips',
    { ga: ['back', 0.005, 0.025, 0], gb: ['back', -0.235, 0.025, 0] },
    { gear: ['stick'], view: [0.3, 0.3, -2.4] },
  ),
  'passive-external-rotation': st(
    'stand',
    // Elbow at the side bent to 90 degrees, the other hand pushing the stick across.
    { a: [0, 4, 90, 80], b: [10, 6, 80, 80], gb: ['gripFront', 0.05, 0, 0], f: grip, g: grip },
    'Push the stick so the forearm swings outward',
    { a: [0, 4, 90, 80, 0, 50], gb: ['gripFront', 0.14, 0, -0.04] },
    { gear: ['stick'], view: [0.5, 1.6, 1.8] },
  ),
  pendulum: seq(
    'stand',
    // Leaning on the other hand with a flat back, the working arm hanging free.
    { pelvis: [38, 0, 0], spine: [12, 0, 0], a: [50, 2, 6, 80], gb: 'table' },
    [
      ['Swing forward and back', { a: [64, 0, 6, 80] }],
      ['Swing side to side', { a: [50, 14, 6, 80] }],
      ['Trace a small circle', { a: [50, 2, 6, 80] }],
    ],
    { gear: ['table'], cycle: 'pendulum' },
  ),
  'towel-behind-back': st(
    'stand',
    {
      ga: ['back', 0.045, -0.013, 0],
      gb: ['occiput', 0.02, -0.03, -0.02],
      f: grip,
      g: grip,
      eb: [-0.5, 0.9, 0],
    },
    'Pull upward with the top hand',
    { ga: ['back', 0.045, 0.085, 0], gb: ['occiput', 0.02, 0.03, -0.02] },
    { gear: ['towel'], view: [0.3, 0.3, -2.4] },
  ),
  'doorway-external-rotation': st(
    'stand',
    { a: [0, 5, 90, 85], ga: 'door' },
    'Turn the chest away from the planted palm',
    { spine: [0, -30, 0], pelvis: [0, -10, 0] },
    { gear: ['door'] },
  ),
  'hands-clasped-behind-back': st(
    'stand',
    {
      ga: 'handsBehind',
      gb: 'handsBehind',
      ha: [[-0.3, -1, -0.2], [-1, 0, 0], 'pelvis'],
      hb: [[0.3, -1, -0.2], [1, 0, 0], 'pelvis'],
      f: [30, 40, 20],
      g: [30, 40, 20],
    },
    'Straighten the elbows and lift the joined hands',
    { ga: ['handsBehind', 0, 0.09, -0.1], gb: ['handsBehind', 0, 0.09, -0.1], shoulders: [-3, 12] },
    { both: true, view: [2.4, 0.3, -0.6] },
  ),
  // Sit tall with the palms flat on the floor just behind the hips, fingers turned out to the
  // sides. Turned out, the wrists stay under 80 degrees and the shoulders are not forced into end
  // range; the trunk leans back a little so the arms are slightly bent and bear the weight.
  'seated-reverse-reach': st(
    'floorSeat',
    {
      leg: [60, 3, 90],
      other: [60, 3, 90],
      pelvis: [-19, 0, 0],
      spine: [-30, 0, 0],
      // The head stays level so the gaze is forward, not up at the ceiling.
      neck: [28, 0, 0],
      ga: [0.2, 0.009, -0.18],
      gb: [-0.2, 0.009, -0.18],
      ha: [
        [1, 0, 0],
        [0, -1, 0],
      ],
      hb: [
        [-1, 0, 0],
        [0, -1, 0],
      ],
      f: onFloor,
      g: onFloor,
    },
    'Slide the hips forward and lift the chest',
    { shift: [0, 0, 0.06], spine: [-34, 0, 0], neck: [32, 0, 0] },
    both,
  ),
  'arm-across-the-back': st(
    'stand',
    { a: [-20, 10, 80, 160, 0, -70], ga: 'backHip', gb: 'Awrist' },
    'Draw the wrist across the lower back',
    { ga: ['back', -0.1, 0, 0], shoulders: [-6, 4] },
    { view: [0.2, 0.25, -2.4] },
  ),
  'wall-walk': seq(
    'stand',
    { ga: ['wall', 0, -0.13, 0], ha: [[0.05, 1, 0.1], [0, 0, 1], 'world', 'tips'], f: open },
    [
      ['Walk the fingers upward', { ga: ['wall', 0, 0.12, 0], shift: [0, 0, 0.06] }],
      ['Step in and reach higher', { ga: ['wall', 0, 0.26, 0], shift: [0, 0, 0.12] }],
    ],
    { gear: ['wall'], cycle: 'walk' },
  ),
  'supine-overhead-stick': st(
    'supine',
    {
      leg: [42, 0, 88],
      other: [42, 0, 88],
      a: [80, 10, 4, 160],
      b: [80, 10, 4, 160],
      f: grip,
      g: grip,
    },
    'Sweep the stick overhead toward the floor',
    { a: [165, 10, 4, 160], b: [165, 10, 4, 160] },
    { both: true, gear: ['stick'] },
  ),
  'arm-circles': seq(
    'stand',
    { a: [0, 88, 5, 92], b: [0, 88, 5, 92], f: open, g: open },
    [
      ['Small circles', { a: [8, 90, 5, 92], b: [8, 90, 5, 92] }],
      ['Widen and reverse', { a: [0, 86, 5, 92], b: [0, 86, 5, 92] }],
    ],
    { both: true, cycle: 'armCircles' },
  ),
  'eagle-arms': st(
    'chair',
    {
      a: [75, -30, 100, 90],
      b: [60, -30, 110, 90],
      ga: ['prayer', -0.032, 0.05, 0],
      gb: ['prayer', 0.032, 0.07, 0],
    },
    'Lift the crossed elbows and ease the hands forward',
    { ga: ['prayer', -0.025, 0.13, 0.05], gb: ['prayer', 0.025, 0.14, 0.05] },
    { view: [1.6, 0.4, 1.9] },
  ),
  'cow-face-arms': st(
    'stand',
    {
      a: [165, 10, 140, 90, 0, 60],
      ga: ['nape', -0.03, -0.02, -0.07],
      gb: 'back',
      ea: [0.5, 0.85, 0.1],
      f: grip,
      g: grip,
    },
    'Bring the hands together between the shoulder blades',
    { ga: ['nape', -0.04, -0.07, -0.07], gb: ['back', 0, 0.2, -0.01] },
    { view: [0.6, 0.3, -2.3] },
  ),
  'doorway-pec': st(
    'stand',
    // Forearms on the frame, elbows at shoulder height: the arms make a goalpost.
    { a: [0, 88, 90, 80, 0, 85], b: [0, 88, 90, 80, 0, 85], ga: 'door', gb: 'door' },
    'Step through and let the chest lean forward',
    { leg: [16, 0, 18], other: [-10, 0, 10], shift: [0, -0.015, 0.11], spine: [6, 0, 0] },
    { both: true, gear: ['door'] },
  ),
  'high-arm-wall-pec': st(
    'stand',
    { a: [0, 105, 86, 80, 0, 85], ga: ['door', 0, 0.11, 0] },
    'Step forward and turn the chest away',
    { leg: [15, 0, 17], spine: [4, -24, 0], shift: [0, -0.015, 0.095], shoulders: [0, 8] },
    { gear: ['door'] },
  ),
  'single-arm-wall-pec': st(
    'stand',
    {
      ga: ['post', 0.06, 0.2, -0.53],
      ha: [
        [0, 0, -1],
        [1, 0, 0],
      ],
      f: open,
    },
    'Turn the body away from the straight arm',
    { spine: [0, -16, 0], pelvis: [0, -4, 0] },
    { gear: ['sideWall'] },
  ),
  'hands-behind-head-opener': st(
    'chair',
    { ga: 'occiput', gb: 'occiput' },
    'Draw the elbows back and lift the chest over the chair back',
    { shoulders: [0, 18], spine: [-20, 0, 0], neck: [-6, 0, 0] },
    { both: true, gear: ['chair'] },
  ),
  'roller-chest-opener': st(
    'supine',
    // Goalpost arms, palms up, elbows bent.
    {
      leg: [43, 0, 85],
      other: [43, 0, 85],
      a: [10, 60, 85, 10, 0, 60],
      b: [10, 60, 85, 10, 0, 60],
      f: open,
      g: open,
    },
    'Let the arms sink toward the floor and breathe',
    { a: [-8, 80, 90, 10, 0, 80], b: [-8, 80, 90, 10, 0, 80], breath: 1 },
    { both: true, gear: ['longRoll'] },
  ),
  'prone-chest-stretch': st(
    'prone',
    { a: [0, 88, 4, 155], f: open, gb: 'floor' },
    'Roll toward the outstretched arm',
    { pelvis: [0, -31, 0], spine: [-8, -18, 0], other: [-14, 25, 68] },
  ),
  'wall-angels': st(
    'stand',
    // Back against the wall, arms in a goalpost with the backs of the hands on the wall.
    { a: [0, 80, 88, 10, 0, 85], b: [0, 80, 88, 10, 0, 85], f: open, g: open },
    'Slide both arms overhead',
    { a: [0, 150, 25, 10, 0, 70], b: [0, 150, 25, 10, 0, 70] },
    { both: true, gear: ['backWall'] },
  ),
  'thoracic-extension-roller': seq(
    'supine',
    { leg: [42, 0, 85], other: [42, 0, 85], ga: 'occiput', gb: 'occiput' },
    [
      ['Ease the upper back over the roller', { spine: [-21, 0, 0] }],
      ['Return and shift the roller', { spine: [0, 0, 0], shift: [0, 0, 0.035] }],
    ],
    { both: true, gear: ['crossRoll'] },
  ),
  'seated-side-breath': st(
    'chair',
    { a: [160, 10, 10, 90] },
    'Lean away and breathe into the open side',
    { spine: [0, 0, -24], a: [168, 6, 8, 90], breath: 1 },
    { view: front },
  ),
  'side-lying-reach-pillow': st(
    'side',
    { a: [125, 16, 8, 90] },
    'Reach overhead and lengthen over the pillow',
    { a: [163, 6, 4, 90], spine: [0, 0, -15], leg: [-6, 4, 0], breath: 1 },
    { gear: ['pillow'] },
  ),
  'overhead-side-bend': st(
    'stand',
    { a: [160, 10, 10, 90] },
    'Reach up and lean away',
    { spine: [0, 0, -27], a: [168, 6, 6, 90] },
    { view: front },
  ),
  'sideways-bend': st(
    'stand',
    {},
    'Slide one hand down the side of the leg',
    { spine: [0, 0, -25], b: [0, 2, 2, 85] },
    { view: front },
  ),
} satisfies Record<string, Recipe>
